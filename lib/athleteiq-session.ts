import type { DailyPlan } from "@/types/athleteiq-daily-plan";
import type { PainGuardrail } from "@/types/athleteiq-pain-safety";
import type { AthleteIqSession, AthleteIqSessionBlock, AthleteIqSessionState } from "@/types/athleteiq-session";

export const ATHLETEIQ_SESSION_CAPABILITY_KEY = "AIQ-1270";
export const ATHLETEIQ_SESSION_VERSION = "aiq-session-1270.1";

export function buildSessionFromPlan(input: {
  athleteId: string;
  dailyPlan: DailyPlan;
  painGuardrail: PainGuardrail;
}, now = new Date()): AthleteIqSession {
  const timestamp = now.toISOString();
  const duration = midpointDuration(input.dailyPlan.recommendation.durationRange);
  const blocks = buildBlocks(duration, input.dailyPlan.recommendation.intensity, input.painGuardrail);
  const sessionId = `aiq-session:${input.athleteId}:${input.dailyPlan.localDate}`;

  return {
    sessionId,
    athleteId: input.athleteId,
    localDate: input.dailyPlan.localDate,
    state: "draft",
    blocks,
    sourcePlanId: input.dailyPlan.id,
    recommendation: input.dailyPlan.recommendation,
    painGuardrail: {
      state: input.painGuardrail.state,
      maxTrainingIntensity: input.painGuardrail.maxTrainingIntensity,
      dailyIqCap: input.painGuardrail.dailyIqCap,
      reasonCodes: input.painGuardrail.reasonCodes
    },
    log: {
      sessionId,
      athleteId: input.athleteId,
      sourcePlanId: input.dailyPlan.id,
      estimatedLoadPoints: estimateSessionLoad(duration, input.dailyPlan.recommendation.intensity)
    },
    auditHistory: [`created:${timestamp}`],
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

export function canTransitionSession(current: AthleteIqSessionState, next: AthleteIqSessionState) {
  const allowed: Record<AthleteIqSessionState, AthleteIqSessionState[]> = {
    draft: ["active", "abandoned"],
    active: ["paused", "completed", "abandoned"],
    paused: ["active", "completed", "abandoned"],
    completed: [],
    abandoned: []
  };
  return allowed[current].includes(next);
}

export function validateGuardrailBeforeStart(session: AthleteIqSession) {
  if (session.painGuardrail.dailyIqCap !== null && session.recommendation.intensity === "high") {
    return "high intensity cannot start under pain cap";
  }
  return null;
}

export function estimateSessionLoad(durationMinutes: number, intensity: DailyPlan["recommendation"]["intensity"], rpe = 5) {
  const factor = intensity === "high" ? 1 : intensity === "moderate" ? 0.8 : intensity === "low" ? 0.6 : 0.4;
  return Math.min(900, Math.round(durationMinutes * factor * Math.max(1, Math.min(10, rpe))));
}

export function isAthleteIqSessionState(value: unknown): value is AthleteIqSessionState {
  return value === "draft" || value === "active" || value === "paused" || value === "completed" || value === "abandoned";
}

function buildBlocks(duration: number, intensity: DailyPlan["recommendation"]["intensity"], guardrail: PainGuardrail): AthleteIqSessionBlock[] {
  const safetyNotesKey = guardrail.dailyIqCap !== null ? "athleteiq.sessions.safety.recoveryOnly" : "athleteiq.sessions.safety.standard";
  if (intensity === "recovery") {
    return [
      { type: "recovery", durationMinutes: duration, intensity, instructionsKey: "athleteiq.sessions.blocks.recovery", safetyNotesKey }
    ];
  }

  const warmup = Math.max(8, Math.round(duration * 0.2));
  const cooldown = Math.max(5, Math.round(duration * 0.15));
  return [
    { type: "warmup", durationMinutes: warmup, intensity: "low", instructionsKey: "athleteiq.sessions.blocks.warmup", safetyNotesKey },
    { type: "main", durationMinutes: Math.max(10, duration - warmup - cooldown), intensity, instructionsKey: "athleteiq.sessions.blocks.main", safetyNotesKey },
    { type: "cooldown", durationMinutes: cooldown, intensity: "recovery", instructionsKey: "athleteiq.sessions.blocks.cooldown", safetyNotesKey }
  ];
}

function midpointDuration(range: string) {
  const [min, max] = range.split("-").map((value) => Number.parseInt(value, 10)).filter(Number.isFinite);
  if (!min || !max) return 30;
  return Math.round((min + max) / 2);
}
