import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/access";
import { athleteIqJsonError, createAthleteIqCorrelationId } from "@/lib/athleteiq-api";
import { getTeamById } from "@/repositories/team.repository";
import { getCoachThresholds, upsertCoachThresholds } from "@/repositories/coach-thresholds.repository";
import { normalizeThresholds } from "@/types/coach-thresholds";

// Configurable readiness/alert thresholds per team (#525 P0). Coach/admin only.
async function authorize(request: Request, correlationId: string) {
  const user = await getAuthUser();
  if (!user) return { error: athleteIqJsonError("AUTH_REQUIRED", 401, correlationId, { retryable: true }) };
  const { searchParams } = new URL(request.url);
  const teamId = searchParams.get("teamId")?.trim();
  if (!teamId) return { error: athleteIqJsonError("VALIDATION_ERROR", 400, correlationId, { details: ["teamId is required"] }) };
  if (!["admin", "trainer", "performance_coach", "physio"].includes(user.primaryRole)) {
    return { error: athleteIqJsonError("FORBIDDEN", 403, correlationId) };
  }
  const team = await getTeamById(teamId);
  if (!team) return { error: athleteIqJsonError("VALIDATION_ERROR", 404, correlationId, { details: ["team not found"] }) };
  const email = user.email.toLowerCase().trim();
  const canView = user.primaryRole === "admin" || user.teamIds.includes(teamId) || team.trainerEmails.includes(email);
  if (!canView) return { error: athleteIqJsonError("FORBIDDEN", 403, correlationId) };
  return { user, teamId, email };
}

export async function GET(request: Request) {
  const correlationId = createAthleteIqCorrelationId();
  const auth = await authorize(request, correlationId);
  if ("error" in auth) return auth.error;
  try {
    const thresholds = await getCoachThresholds(auth.teamId);
    return NextResponse.json({ thresholds, correlationId });
  } catch (error) {
    return athleteIqJsonError("UNKNOWN_ERROR", 500, correlationId, { retryable: true, details: (error as Error).message });
  }
}

export async function PATCH(request: Request) {
  const correlationId = createAthleteIqCorrelationId();
  const auth = await authorize(request, correlationId);
  if ("error" in auth) return auth.error;
  if (auth.user.primaryRole === "physio") return athleteIqJsonError("FORBIDDEN", 403, correlationId);
  try {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const normalized = normalizeThresholds({ greenMin: body?.greenMin, yellowMin: body?.yellowMin });
    if (!normalized) {
      return athleteIqJsonError("VALIDATION_ERROR", 400, correlationId, { details: ["greenMin must be > yellowMin, both within 0–5"] });
    }
    const saved = await upsertCoachThresholds({ teamId: auth.teamId, ...normalized, actorEmail: auth.email });
    return NextResponse.json({ thresholds: saved, correlationId });
  } catch (error) {
    return athleteIqJsonError("UNKNOWN_ERROR", 500, correlationId, { retryable: true, details: (error as Error).message });
  }
}
