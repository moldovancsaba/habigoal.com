import { NextResponse } from "next/server";
import { canAccessAthlete, getAuthUser } from "@/lib/access";
import { athleteIqJsonError, createAthleteIqCorrelationId } from "@/lib/athleteiq-api";
import { getLocalDateForTimezone, isAthleteIqCheckInMode } from "@/lib/athleteiq-check-in";
import { ATHLETEIQ_DAILY_IQ_CAPABILITY_KEY, projectDailyIqSnapshotForRole } from "@/lib/athleteiq-daily-iq";
import { listLatestDailyIqSnapshots } from "@/repositories/athleteiq-daily-iq.repository";

export async function GET(request: Request) {
  const correlationId = createAthleteIqCorrelationId();
  const startedAt = Date.now();
  const user = await getAuthUser({ productSurface: "athlete-iq" });
  if (!user) return athleteIqJsonError("AUTH_REQUIRED", 401, correlationId, { retryable: true });

  try {
    const { searchParams } = new URL(request.url);
    const athleteId = searchParams.get("athleteId")?.trim();
    const timezone = searchParams.get("timezone")?.trim() || "UTC";
    const today = getLocalDateForTimezone(timezone);
    const from = searchParams.get("from")?.trim() || today;
    const to = searchParams.get("to")?.trim() || today;
    const modeParam = searchParams.get("mode");
    const mode = isAthleteIqCheckInMode(modeParam) ? modeParam : "performance";

    if (!athleteId) return athleteIqJsonError("VALIDATION_ERROR", 400, correlationId, { details: ["athleteId is required"] });
    if (!isDate(from) || !isDate(to)) return athleteIqJsonError("VALIDATION_ERROR", 400, correlationId, { details: ["from and to must use YYYY-MM-DD"] });
    if (from > to) return athleteIqJsonError("VALIDATION_ERROR", 400, correlationId, { details: ["from must be before or equal to to"] });
    if (!(await canAccessAthlete(user, athleteId))) {
      console.warn(JSON.stringify({ capabilityKey: ATHLETEIQ_DAILY_IQ_CAPABILITY_KEY, event: "athleteiq.daily_iq_history.authorization_denied", correlationId }));
      return athleteIqJsonError("FORBIDDEN", 403, correlationId);
    }

    const snapshots = await listLatestDailyIqSnapshots({ athleteId, from, to, mode });
    return NextResponse.json({
      snapshots: snapshots.map((snapshot) => projectDailyIqSnapshotForRole(snapshot, { role: user.primaryRole })),
      from,
      to,
      mode,
      count: snapshots.length,
      correlationId,
      generatedAt: new Date().toISOString(),
      latencyMs: Date.now() - startedAt
    });
  } catch (error) {
    return athleteIqJsonError("UNKNOWN_ERROR", 500, correlationId, { retryable: true, details: (error as Error).message });
  }
}

function isDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}
