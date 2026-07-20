import { NextResponse } from "next/server";
import { jsonError, readJson, requireRole } from "@/lib/api";
import { getAuthUser, resolveAccessibleAthleteIds, resolveAccessibleTeamIds } from "@/lib/access";
import { getLoadComparison, getTrainingSessionBySessionId, listTrainingSessions, upsertTrainingSession } from "@/repositories/training-sessions.repository";
import type { SessionCategory, SessionPlan } from "@/types/training-plan";

const CATEGORIES: SessionCategory[] = ["strength", "tactical", "endurance", "speed", "recovery", "match"];

export async function GET(request: Request) {
  const authError = await requireRole(request, ["admin", "trainer", "performance_coach"]);
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const teamId = searchParams.get("teamId") ?? undefined;
  const athleteId = searchParams.get("athleteId") ?? undefined;
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;
  const compareSessionId = searchParams.get("compareSessionId");
  const authUser = await getAuthUser({ productSurface: "athlete-iq" });
  if (!authUser) return jsonError("Athlete IQ access required", 403, "PRODUCT_ACCESS_DENIED");
  const [allowedAthleteIds, allowedTeamIds] = await Promise.all([
    resolveAccessibleAthleteIds(authUser),
    resolveAccessibleTeamIds(authUser)
  ]);

  if (compareSessionId) {
    const session = await getTrainingSessionBySessionId(compareSessionId);
    if (session && !canAccessTrainingSession(session, allowedAthleteIds, allowedTeamIds)) {
      return jsonError("Forbidden", 403, "FORBIDDEN");
    }
    const comparison = await getLoadComparison(compareSessionId);
    return NextResponse.json({ comparison });
  }

  const plans = await listTrainingSessions({ teamId, athleteId, from, to });
  return NextResponse.json({
    plans: plans.filter((plan) => canAccessTrainingSession(plan, allowedAthleteIds, allowedTeamIds)),
    categories: CATEGORIES
  });
}

export async function POST(request: Request) {
  const authError = await requireRole(request, ["admin", "trainer", "performance_coach"]);
  if (authError) return authError;

  const body = (await readJson(request)) as Record<string, unknown> | null;
  if (!body?.title || !body?.date) {
    return jsonError("title and date are required", 400, "VALIDATION_ERROR");
  }

  const category = CATEGORIES.includes(body.category as SessionCategory) ? (body.category as SessionCategory) : "tactical";
  // Resolve the coach from the authenticated session — never trust a client-supplied
  // coachId (previously hardcoded "coach"). Existing rows keep their coachId on update.
  const authUser = await getAuthUser({ productSurface: "athlete-iq" });
  if (!authUser) return jsonError("Athlete IQ access required", 403, "PRODUCT_ACCESS_DENIED");
  const assignedAthleteIds = Array.isArray(body.assignedAthleteIds) ? body.assignedAthleteIds.filter((v): v is string => typeof v === "string") : [];
  const assignedTeamId = typeof body.assignedTeamId === "string" ? body.assignedTeamId : undefined;
  const [allowedAthleteIds, allowedTeamIds] = await Promise.all([
    resolveAccessibleAthleteIds(authUser),
    resolveAccessibleTeamIds(authUser)
  ]);
  const existingSession = typeof body.sessionId === "string" ? await getTrainingSessionBySessionId(body.sessionId) : null;
  if (existingSession && !canAccessTrainingSession(existingSession, allowedAthleteIds, allowedTeamIds)) {
    return jsonError("Forbidden", 403, "FORBIDDEN");
  }
  if (!canWriteTrainingSessionAssignment(assignedAthleteIds, assignedTeamId, allowedAthleteIds, allowedTeamIds)) {
    return jsonError("Forbidden", 403, "FORBIDDEN");
  }
  const resolvedCoachId = existingSession?.coachId || authUser.email;
  const plan = await upsertTrainingSession({
    sessionId: typeof body.sessionId === "string" ? body.sessionId : crypto.randomUUID(),
    organisationId: typeof body.organisationId === "string" ? body.organisationId : "default",
    coachId: resolvedCoachId,
    title: String(body.title),
    description: typeof body.description === "string" ? body.description : "",
    category,
    date: String(body.date),
    durationMinutes: typeof body.durationMinutes === "number" ? body.durationMinutes : 60,
    assignedAthleteIds,
    assignedTeamId,
    plannedLoadPoints: typeof body.plannedLoadPoints === "number" ? body.plannedLoadPoints : 0,
  });

  return NextResponse.json(plan);
}

function canAccessTrainingSession(
  session: SessionPlan,
  allowedAthleteIds: string[] | null,
  allowedTeamIds: string[] | null
) {
  if (allowedAthleteIds === null || allowedTeamIds === null) return true;
  if (session.assignedTeamId && allowedTeamIds.includes(session.assignedTeamId)) return true;
  return (session.assignedAthleteIds ?? []).some((athleteId) => allowedAthleteIds.includes(athleteId));
}

function canWriteTrainingSessionAssignment(
  assignedAthleteIds: string[],
  assignedTeamId: string | undefined,
  allowedAthleteIds: string[] | null,
  allowedTeamIds: string[] | null
) {
  if (allowedAthleteIds === null || allowedTeamIds === null) return true;
  if (assignedTeamId && allowedTeamIds.includes(assignedTeamId)) return true;
  return assignedAthleteIds.length > 0 && assignedAthleteIds.every((athleteId) => allowedAthleteIds.includes(athleteId));
}
