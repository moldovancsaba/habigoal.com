import { NextResponse } from "next/server";
import { canAccessAthlete, getAuthUser } from "@/lib/access";
import { athleteIqJsonError, createAthleteIqCorrelationId } from "@/lib/athleteiq-api";
import { getLocalDateForTimezone, isAthleteIqCheckInMode } from "@/lib/athleteiq-check-in";
import { ATHLETEIQ_DAILY_IQ_CAPABILITY_KEY, projectDailyIqSnapshotForRole } from "@/lib/athleteiq-daily-iq";
import { getLatestDailyIqSnapshot } from "@/repositories/athleteiq-daily-iq.repository";

export async function GET(request: Request) {
  const correlationId = createAthleteIqCorrelationId();
  const startedAt = Date.now();
  const user = await getAuthUser();
  if (!user) return athleteIqJsonError("AUTH_REQUIRED", 401, correlationId, { retryable: true });

  try {
    const { searchParams } = new URL(request.url);
    const athleteId = searchParams.get("athleteId")?.trim();
    const timezone = searchParams.get("timezone")?.trim() || "UTC";
    const modeParam = searchParams.get("mode");
    const mode = isAthleteIqCheckInMode(modeParam) ? modeParam : "performance";

    if (!athleteId) return athleteIqJsonError("VALIDATION_ERROR", 400, correlationId, { details: ["athleteId is required"] });
    if (!(await canAccessAthlete(user, athleteId))) {
      console.warn(JSON.stringify({ capabilityKey: ATHLETEIQ_DAILY_IQ_CAPABILITY_KEY, event: "athleteiq.daily_iq_today.authorization_denied", correlationId }));
      return athleteIqJsonError("FORBIDDEN", 403, correlationId);
    }

    const localDate = getLocalDateForTimezone(timezone);
    const snapshot = await getLatestDailyIqSnapshot({ athleteId, localDate, mode });
    return NextResponse.json({
      snapshot: snapshot ? projectDailyIqSnapshotForRole(snapshot, { role: user.primaryRole }) : null,
      localDate,
      mode,
      empty: !snapshot,
      correlationId,
      generatedAt: new Date().toISOString(),
      latencyMs: Date.now() - startedAt
    });
  } catch (error) {
    return athleteIqJsonError("UNKNOWN_ERROR", 500, correlationId, { retryable: true, details: (error as Error).message });
  }
}
