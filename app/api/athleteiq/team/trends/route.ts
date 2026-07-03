import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/access";
import { athleteIqJsonError, createAthleteIqCorrelationId } from "@/lib/athleteiq-api";
import { getLocalDateForTimezone } from "@/lib/athleteiq-check-in";
import { getTeamById } from "@/repositories/team.repository";
import { getTeamReadinessTrend } from "@/services/athleteiq-team-trends.service";

// Team readiness trend (GH-526 P1). Coach/admin only.
export async function GET(request: Request) {
  const correlationId = createAthleteIqCorrelationId();
  const startedAt = Date.now();
  const user = await getAuthUser();
  if (!user) return athleteIqJsonError("AUTH_REQUIRED", 401, correlationId, { retryable: true });

  try {
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get("teamId")?.trim();
    const timezone = searchParams.get("timezone")?.trim() || "UTC";
    const daysParam = Number.parseInt(searchParams.get("days")?.trim() || "14", 10);
    const days = Number.isFinite(daysParam) ? Math.min(Math.max(daysParam, 2), 90) : 14;

    if (!teamId) return athleteIqJsonError("VALIDATION_ERROR", 400, correlationId, { details: ["teamId is required"] });
    if (!["admin", "trainer", "performance_coach", "physio"].includes(user.primaryRole)) {
      return athleteIqJsonError("FORBIDDEN", 403, correlationId);
    }
    const team = await getTeamById(teamId);
    if (!team) return athleteIqJsonError("VALIDATION_ERROR", 404, correlationId, { details: ["team not found"] });
    const email = user.email.toLowerCase().trim();
    const canView = user.primaryRole === "admin" || user.teamIds.includes(teamId) || team.trainerEmails.includes(email);
    if (!canView) return athleteIqJsonError("FORBIDDEN", 403, correlationId);

    const to = getLocalDateForTimezone(timezone);
    const from = shiftDate(to, -(days - 1));
    const trend = await getTeamReadinessTrend({ athleteIds: team.athleteIds, from, to });

    return NextResponse.json({
      ...trend,
      teamId,
      from,
      to,
      correlationId,
      generatedAt: new Date().toISOString(),
      latencyMs: Date.now() - startedAt,
    });
  } catch (error) {
    return athleteIqJsonError("UNKNOWN_ERROR", 500, correlationId, { retryable: true, details: (error as Error).message });
  }
}

function shiftDate(localDate: string, deltaDays: number): string {
  const date = new Date(`${localDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + deltaDays);
  return date.toISOString().slice(0, 10);
}
