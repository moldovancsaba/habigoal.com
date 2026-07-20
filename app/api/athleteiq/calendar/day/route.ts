import { NextResponse } from "next/server";
import { canAccessAthlete, getAuthUser } from "@/lib/access";
import { athleteIqJsonError, createAthleteIqCorrelationId } from "@/lib/athleteiq-api";
import { ATHLETEIQ_CALENDAR_CAPABILITY_KEY } from "@/lib/athleteiq-calendar";
import { getDailyRealityMap } from "@/services/athleteiq-calendar.service";

export async function GET(request: Request) {
  const correlationId = createAthleteIqCorrelationId();
  const startedAt = Date.now();
  const user = await getAuthUser({ productSurface: "athlete-iq" });
  if (!user) return athleteIqJsonError("AUTH_REQUIRED", 401, correlationId, { retryable: true });

  try {
    const { searchParams } = new URL(request.url);
    const athleteId = searchParams.get("athleteId")?.trim();
    const localDate = searchParams.get("date")?.trim();
    const timezone = searchParams.get("timezone")?.trim() || "UTC";
    if (!athleteId) return athleteIqJsonError("VALIDATION_ERROR", 400, correlationId, { details: ["athleteId is required"] });
    if (!localDate || !/^\d{4}-\d{2}-\d{2}$/.test(localDate)) return athleteIqJsonError("VALIDATION_ERROR", 400, correlationId, { details: ["date must use YYYY-MM-DD"] });
    if (!(await canAccessAthlete(user, athleteId))) return athleteIqJsonError("FORBIDDEN", 403, correlationId);

    const context = await getDailyRealityMap({ athleteId, localDate, timezone });
    console.info(JSON.stringify({ capabilityKey: ATHLETEIQ_CALENDAR_CAPABILITY_KEY, event: "athleteiq.calendar.day_viewed", correlationId, athleteId, localDate, entryCount: context.entries.length + context.unscheduledEntries.length, conflictCount: context.conflicts.length, latencyMs: Date.now() - startedAt }));
    return NextResponse.json({ context, correlationId, generatedAt: new Date().toISOString(), latencyMs: Date.now() - startedAt });
  } catch (error) {
    return athleteIqJsonError("UNKNOWN_ERROR", 500, correlationId, { retryable: true, details: (error as Error).message });
  }
}
