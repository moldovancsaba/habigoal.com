import { NextResponse } from "next/server";
import { canAccessAthlete, getAuthUser } from "@/lib/access";
import { athleteIqJsonError, createAthleteIqCorrelationId } from "@/lib/athleteiq-api";
import { ATHLETEIQ_CHECK_IN_CAPABILITY_KEY, getLocalDateForTimezone, isAthleteIqCheckInMode } from "@/lib/athleteiq-check-in";
import { getAthleteIqCheckInSnapshot } from "@/repositories/athleteiq-check-in.repository";

export async function GET(request: Request) {
  const correlationId = createAthleteIqCorrelationId();
  const startedAt = Date.now();
  const user = await getAuthUser({ productSurface: "athlete-iq" });
  if (!user) return athleteIqJsonError("AUTH_REQUIRED", 401, correlationId, { retryable: true });

  try {
    const { searchParams } = new URL(request.url);
    const athleteId = searchParams.get("athleteId")?.trim();
    const timezone = searchParams.get("timezone")?.trim() || "UTC";
    const modeParam = searchParams.get("mode");
    const mode = isAthleteIqCheckInMode(modeParam) ? modeParam : "lifestyle";

    if (!athleteId) return athleteIqJsonError("VALIDATION_ERROR", 400, correlationId, { details: ["athleteId is required"] });
    if (!(await canAccessAthlete(user, athleteId))) {
      console.warn(JSON.stringify({ capabilityKey: ATHLETEIQ_CHECK_IN_CAPABILITY_KEY, event: "athleteiq.checkin_today.authorization_denied", correlationId }));
      return athleteIqJsonError("FORBIDDEN", 403, correlationId);
    }

    const localDate = getLocalDateForTimezone(timezone);
    const snapshot = await getAthleteIqCheckInSnapshot(athleteId, localDate, mode);
    return NextResponse.json({
      snapshot,
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
