import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/access";
import { athleteIqJsonError, createAthleteIqCorrelationId } from "@/lib/athleteiq-api";
import { getTeamById } from "@/repositories/team.repository";
import { getCoachCoachingQueue } from "@/services/athleteiq-coaching-queue.service";

// Coach recommendation queue (GH-525 P0). Returns the per-athlete recommendation
// engine output for a team, triage-ordered. Coach/admin only — raw recommendation
// text (incl. awaiting_review) is authorized for coaching surfaces.
export async function GET(request: Request) {
  const correlationId = createAthleteIqCorrelationId();
  const startedAt = Date.now();
  const user = await getAuthUser({ productSurface: "athlete-iq" });
  if (!user) return athleteIqJsonError("AUTH_REQUIRED", 401, correlationId, { retryable: true });

  try {
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get("teamId")?.trim();
    const minConfidence = searchParams.get("minConfidence")?.trim();

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

    let entries = await getCoachCoachingQueue({ athleteIds: team.athleteIds });
    if (minConfidence === "high") entries = entries.filter((e) => e.recommendation.confidence === "high");
    else if (minConfidence === "medium") entries = entries.filter((e) => e.recommendation.confidence !== "low");

    return NextResponse.json({
      recommendations: entries.map((e) => ({
        athleteId: e.athleteId,
        readiness: e.readiness,
        recommendation: e.recommendation,
        urgency: e.urgency,
      })),
      teamId,
      count: entries.length,
      correlationId,
      generatedAt: new Date().toISOString(),
      latencyMs: Date.now() - startedAt,
    });
  } catch (error) {
    return athleteIqJsonError("UNKNOWN_ERROR", 500, correlationId, { retryable: true, details: (error as Error).message });
  }
}
