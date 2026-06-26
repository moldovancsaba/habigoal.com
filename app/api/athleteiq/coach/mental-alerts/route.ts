import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/access";
import { athleteIqJsonError, createAthleteIqCorrelationId } from "@/lib/athleteiq-api";
import { ATHLETEIQ_MENTAL_EDGE_CAPABILITY_KEY } from "@/lib/athleteiq-mental-edge";
import { getTeamById } from "@/repositories/team.repository";
import { getCoachMentalAlerts } from "@/services/athleteiq-mental-edge.service";

export async function GET(request: Request) {
  const correlationId = createAthleteIqCorrelationId();
  const startedAt = Date.now();
  const user = await getAuthUser();
  if (!user) return athleteIqJsonError("AUTH_REQUIRED", 401, correlationId, { retryable: true });

  try {
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get("teamId")?.trim();
    const timezone = searchParams.get("timezone")?.trim() || "UTC";
    const localDate = searchParams.get("localDate")?.trim();

    if (!teamId) return athleteIqJsonError("VALIDATION_ERROR", 400, correlationId, { details: ["teamId is required"] });
    if (!["admin", "trainer", "performance_coach", "physio"].includes(user.primaryRole)) {
      return athleteIqJsonError("FORBIDDEN", 403, correlationId);
    }

    const team = await getTeamById(teamId);
    if (!team) return athleteIqJsonError("VALIDATION_ERROR", 404, correlationId, { details: ["team not found"] });
    const normalizedEmail = user.email.toLowerCase().trim();
    const canViewTeam = user.primaryRole === "admin" || user.teamIds.includes(teamId) || team.trainerEmails.includes(normalizedEmail);
    if (!canViewTeam) {
      console.warn(JSON.stringify({ capabilityKey: ATHLETEIQ_MENTAL_EDGE_CAPABILITY_KEY, event: "athleteiq.coach_mental_alerts.authorization_denied", correlationId, teamId }));
      return athleteIqJsonError("FORBIDDEN", 403, correlationId);
    }

    const alerts = await getCoachMentalAlerts({ athleteIds: team.athleteIds, timezone, localDate });
    console.info(JSON.stringify({ capabilityKey: ATHLETEIQ_MENTAL_EDGE_CAPABILITY_KEY, event: "athleteiq.coach_mental_alerts.viewed", correlationId, teamId, count: alerts.length, latencyMs: Date.now() - startedAt }));

    return NextResponse.json({
      alerts,
      teamId,
      count: alerts.length,
      correlationId,
      generatedAt: new Date().toISOString(),
      latencyMs: Date.now() - startedAt
    });
  } catch (error) {
    return athleteIqJsonError("UNKNOWN_ERROR", 500, correlationId, { retryable: true, details: (error as Error).message });
  }
}
