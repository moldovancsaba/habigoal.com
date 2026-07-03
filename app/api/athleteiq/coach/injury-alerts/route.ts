import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/access";
import { athleteIqJsonError, createAthleteIqCorrelationId } from "@/lib/athleteiq-api";
import { getTeamById } from "@/repositories/team.repository";
import { getCoachCoachingQueue } from "@/services/athleteiq-coaching-queue.service";

// Injury-risk coach alerts (GH-525 P0). Returns athletes with an elevated/high
// injury-risk signal for a team, triage-ordered. Coach/admin only.
export async function GET(request: Request) {
  const correlationId = createAthleteIqCorrelationId();
  const startedAt = Date.now();
  const user = await getAuthUser();
  if (!user) return athleteIqJsonError("AUTH_REQUIRED", 401, correlationId, { retryable: true });

  try {
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get("teamId")?.trim();
    const includeLow = searchParams.get("includeLow") === "true";

    if (!teamId) return athleteIqJsonError("VALIDATION_ERROR", 400, correlationId, { details: ["teamId is required"] });
    if (!["admin", "trainer", "performance_coach", "physio"].includes(user.primaryRole)) {
      return athleteIqJsonError("FORBIDDEN", 403, correlationId);
    }

    const team = await getTeamById(teamId);
    if (!team) return athleteIqJsonError("VALIDATION_ERROR", 404, correlationId, { details: ["team not found"] });
    const normalizedEmail = user.email.toLowerCase().trim();
    const canViewTeam =
      user.primaryRole === "admin" || user.teamIds.includes(teamId) || team.trainerEmails.includes(normalizedEmail);
    if (!canViewTeam) return athleteIqJsonError("FORBIDDEN", 403, correlationId);

    const queue = await getCoachCoachingQueue({ athleteIds: team.athleteIds });
    const alerts = queue
      .filter((e) => includeLow || e.injuryRisk.riskLevel !== "low")
      .map((e) => ({
        athleteId: e.athleteId,
        injuryRisk: e.injuryRisk,
        readiness: e.readiness,
        urgency: e.urgency,
      }));

    return NextResponse.json({
      alerts,
      teamId,
      count: alerts.length,
      correlationId,
      generatedAt: new Date().toISOString(),
      latencyMs: Date.now() - startedAt,
    });
  } catch (error) {
    return athleteIqJsonError("UNKNOWN_ERROR", 500, correlationId, { retryable: true, details: (error as Error).message });
  }
}
