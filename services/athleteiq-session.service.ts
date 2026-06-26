import { buildSessionFromPlan, canTransitionSession, estimateSessionLoad, validateGuardrailBeforeStart } from "@/lib/athleteiq-session";
import { getDailyPlanByDate } from "@/repositories/athleteiq-daily-plan.repository";
import { getAthleteIqSession, listAthleteIqSessions, updateAthleteIqSessionDebrief, updateAthleteIqSessionState, upsertAthleteIqSession } from "@/repositories/athleteiq-session.repository";
import { recordSessionRpe } from "@/repositories/training-sessions.repository";
import { getPainGuardrailToday } from "@/services/athleteiq-pain-safety.service";
import type { AthleteIqSessionState } from "@/types/athleteiq-session";

export async function getSession(sessionId: string) {
  return getAthleteIqSession(sessionId);
}

export async function createSessionFromPlan(input: {
  athleteId: string;
  localDate: string;
  timezone?: string;
}) {
  const dailyPlan = await getDailyPlanByDate(input.athleteId, input.localDate);
  if (!dailyPlan) return { errors: ["daily plan not found"] };
  const painGuardrail = await getPainGuardrailToday({ athleteId: input.athleteId, localDate: input.localDate, timezone: input.timezone });
  const session = buildSessionFromPlan({ athleteId: input.athleteId, dailyPlan, painGuardrail });
  return { session: await upsertAthleteIqSession(session), errors: [] };
}

export async function transitionSessionState(input: {
  sessionId: string;
  state: AthleteIqSessionState;
  actorEmail: string;
  reason?: string;
}) {
  const session = await getAthleteIqSession(input.sessionId);
  if (!session) return { errors: ["session not found"] };
  if (session.state === input.state) return { session, errors: [] };
  if (!canTransitionSession(session.state, input.state)) return { errors: [`cannot transition from ${session.state} to ${input.state}`] };
  if (input.state === "active") {
    const guardrailError = validateGuardrailBeforeStart(session);
    if (guardrailError) return { errors: [guardrailError] };
  }
  if (input.state === "abandoned" && !input.reason) return { errors: ["abandoned sessions require reason"] };
  return { session: await updateAthleteIqSessionState({ session, state: input.state, actorEmail: input.actorEmail, reason: input.reason }), errors: [] };
}

export async function debriefSession(input: {
  sessionId: string;
  actorEmail: string;
  rpe: number;
  completionPct: number;
  painAfter: number;
  moodAfter: number;
  notes?: string;
}) {
  const session = await getAthleteIqSession(input.sessionId);
  if (!session) return { errors: ["session not found"] };
  if (session.state === "abandoned") return { errors: ["abandoned sessions cannot be debriefed"] };
  if (input.rpe < 1 || input.rpe > 10) return { errors: ["rpe must be 1-10"] };
  if (input.completionPct < 0 || input.completionPct > 100) return { errors: ["completionPct must be 0-100"] };
  if (input.painAfter < 1 || input.painAfter > 10) return { errors: ["painAfter must be 1-10"] };
  if (input.moodAfter < 1 || input.moodAfter > 10) return { errors: ["moodAfter must be 1-10"] };
  const durationMinutes = session.blocks.reduce((sum, block) => sum + block.durationMinutes, 0);
  const estimatedLoadPoints = estimateSessionLoad(durationMinutes, session.recommendation.intensity, input.rpe);
  const saved = await updateAthleteIqSessionDebrief({
    session,
    actorEmail: input.actorEmail,
    log: {
      rpe: input.rpe,
      completionPct: input.completionPct,
      painAfter: input.painAfter,
      moodAfter: input.moodAfter,
      notes: input.notes,
      estimatedLoadPoints
    }
  });
  await recordSessionRpe({
    sessionId: session.sessionId,
    athleteId: session.athleteId,
    rpeScore: input.rpe,
    durationMinutes,
    completedLoadPoints: estimatedLoadPoints,
    recordedAt: new Date().toISOString()
  });
  return { session: saved, errors: [] };
}

export async function listSessions(input: { athleteId: string; from?: string; to?: string }) {
  return listAthleteIqSessions(input);
}
