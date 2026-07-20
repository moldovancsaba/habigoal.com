import { NextResponse } from "next/server";
import { jsonError, readJson, requireRole } from "@/lib/api";
import { getAuthUser } from "@/lib/access";
import { getLoadComparison, listTrainingSessions, upsertTrainingSession } from "@/repositories/training-sessions.repository";
import type { SessionCategory } from "@/types/training-plan";

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

  if (compareSessionId) {
    const comparison = await getLoadComparison(compareSessionId);
    return NextResponse.json({ comparison });
  }

  const plans = await listTrainingSessions({ teamId, athleteId, from, to });
  return NextResponse.json({ plans, categories: CATEGORIES });
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
  const resolvedCoachId =
    (typeof body.sessionId === "string" && typeof body.coachId === "string" ? body.coachId : null) ??
    authUser?.email ??
    "unknown";
  const plan = await upsertTrainingSession({
    sessionId: typeof body.sessionId === "string" ? body.sessionId : crypto.randomUUID(),
    organisationId: typeof body.organisationId === "string" ? body.organisationId : "default",
    coachId: resolvedCoachId,
    title: String(body.title),
    description: typeof body.description === "string" ? body.description : "",
    category,
    date: String(body.date),
    durationMinutes: typeof body.durationMinutes === "number" ? body.durationMinutes : 60,
    assignedAthleteIds: Array.isArray(body.assignedAthleteIds) ? body.assignedAthleteIds.filter((v): v is string => typeof v === "string") : [],
    assignedTeamId: typeof body.assignedTeamId === "string" ? body.assignedTeamId : undefined,
    plannedLoadPoints: typeof body.plannedLoadPoints === "number" ? body.plannedLoadPoints : 0,
  });

  return NextResponse.json(plan);
}
