import { NextResponse } from "next/server";
import { canOpenProductSurface, getAuthUser } from "@/lib/access";
import { athleteIqJsonError, createAthleteIqCorrelationId } from "@/lib/athleteiq-api";
import { ATHLETEIQ_STAKEHOLDER_CAPABILITY_KEY, canViewTeamProjection } from "@/lib/athleteiq-stakeholder";
import { getTeamById } from "@/repositories/team.repository";
import { getTeamOverviewProjection } from "@/services/athleteiq-stakeholder.service";

export async function GET(request: Request) {
  const correlationId = createAthleteIqCorrelationId();
  const startedAt = Date.now();
  const user = await getAuthUser();
  if (!user) return athleteIqJsonError("AUTH_REQUIRED", 401, correlationId, { retryable: true });
  if (!canOpenProductSurface(user, "athlete-iq")) return athleteIqJsonError("PRODUCT_ACCESS_DENIED", 403, correlationId, { retryable: false });

  try {
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get("teamId")?.trim();
    const localDate = searchParams.get("date")?.trim() || new Date().toISOString().slice(0, 10);
    const timezone = searchParams.get("timezone")?.trim() || "UTC";
    if (!teamId) return athleteIqJsonError("VALIDATION_ERROR", 400, correlationId, { details: ["teamId is required"] });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(localDate)) return athleteIqJsonError("VALIDATION_ERROR", 400, correlationId, { details: ["date must use YYYY-MM-DD"] });
    if (!["admin", "trainer", "performance_coach", "physio", "analyst", "club_management"].includes(user.primaryRole)) return athleteIqJsonError("FORBIDDEN", 403, correlationId);

    const team = await getTeamById(teamId);
    if (!team) return athleteIqJsonError("VALIDATION_ERROR", 404, correlationId, { details: ["team not found"] });
    if (!canViewTeamProjection(user, teamId, team.trainerEmails)) return athleteIqJsonError("FORBIDDEN", 403, correlationId);

    const projection = await getTeamOverviewProjection({ teamId, localDate, timezone });
    console.info(JSON.stringify({ capabilityKey: ATHLETEIQ_STAKEHOLDER_CAPABILITY_KEY, event: "athleteiq.team.overview_viewed", correlationId, teamId, suppressed: projection?.readinessDistribution.suppressed, privacyClassification: "team_projection_aggregate", latencyMs: Date.now() - startedAt }));
    return NextResponse.json({ projection, correlationId, generatedAt: new Date().toISOString(), latencyMs: Date.now() - startedAt });
  } catch (error) {
    return athleteIqJsonError("UNKNOWN_ERROR", 500, correlationId, { retryable: true, details: (error as Error).message });
  }
}
