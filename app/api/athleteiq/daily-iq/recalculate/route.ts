import { NextResponse } from "next/server";
import { canAccessAthlete, getAuthUser } from "@/lib/access";
import { readJson } from "@/lib/api";
import { athleteIqJsonError, createAthleteIqCorrelationId } from "@/lib/athleteiq-api";
import { ATHLETEIQ_DAILY_IQ_CAPABILITY_KEY, projectDailyIqSnapshotForRole } from "@/lib/athleteiq-daily-iq";
import { recalculateDailyIq } from "@/services/athleteiq-daily-iq.service";
import type { DailyIqRecalculateRequest } from "@/types/athleteiq-daily-iq";

export async function POST(request: Request) {
  const correlationId = createAthleteIqCorrelationId();
  const startedAt = Date.now();
  const user = await getAuthUser();
  if (!user) return athleteIqJsonError("AUTH_REQUIRED", 401, correlationId, { retryable: true });

  try {
    const body = (await readJson(request)) as DailyIqRecalculateRequest | null;
    const athleteId = typeof body?.athleteId === "string" ? body.athleteId.trim() : "";
    if (!athleteId) return athleteIqJsonError("VALIDATION_ERROR", 400, correlationId, { details: ["athleteId is required"] });
    if (!(await canAccessAthlete(user, athleteId))) {
      console.warn(JSON.stringify({ capabilityKey: ATHLETEIQ_DAILY_IQ_CAPABILITY_KEY, event: "athleteiq.daily_iq.authorization_denied", correlationId }));
      return athleteIqJsonError("FORBIDDEN", 403, correlationId);
    }

    const result = await recalculateDailyIq(body || {});
    if (!("snapshot" in result)) return athleteIqJsonError("VALIDATION_ERROR", 400, correlationId, { details: result.errors });

    console.info(JSON.stringify({
      capabilityKey: ATHLETEIQ_DAILY_IQ_CAPABILITY_KEY,
      event: "athleteiq.daily_iq.recalculated",
      correlationId,
      athleteId,
      localDate: result.snapshot.localDate,
      confidence: result.snapshot.confidence,
      success: true,
      latencyMs: Date.now() - startedAt
    }));

    return NextResponse.json({
      snapshot: projectDailyIqSnapshotForRole(result.snapshot, { role: user.primaryRole }),
      correlationId,
      generatedAt: new Date().toISOString(),
      latencyMs: Date.now() - startedAt
    });
  } catch (error) {
    return athleteIqJsonError("UNKNOWN_ERROR", 500, correlationId, { retryable: true, details: (error as Error).message });
  }
}
