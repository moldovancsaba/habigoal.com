import { NextResponse } from "next/server";
import { canAccessAthlete, getAuthUser } from "@/lib/access";
import { readJson } from "@/lib/api";
import { logAuditEvent } from "@/lib/audit";
import { athleteIqJsonError, createAthleteIqCorrelationId } from "@/lib/athleteiq-api";
import { ATHLETEIQ_CHECK_IN_CAPABILITY_KEY, buildAthleteIqCheckInSnapshot } from "@/lib/athleteiq-check-in";
import { upsertAthleteIqCheckInWithSharedDailyMirror } from "@/services/athleteiq-check-in-persistence.service";
import { runAthleteIqDailyEngine } from "@/services/athleteiq-daily-engine.service";
import type { AthleteIqCheckInInput } from "@/types/athleteiq-check-in";

export async function POST(request: Request) {
  const correlationId = createAthleteIqCorrelationId();
  const startedAt = Date.now();
  const user = await getAuthUser({ productSurface: "athlete-iq" });
  if (!user) return athleteIqJsonError("AUTH_REQUIRED", 401, correlationId, { retryable: true });

  try {
    const body = (await readJson(request)) as AthleteIqCheckInInput | null;
    const result = buildAthleteIqCheckInSnapshot(body || { athleteId: "" });
    if (!result.snapshot) {
      return athleteIqJsonError("VALIDATION_ERROR", 400, correlationId, { details: result.errors });
    }

    if (!(await canAccessAthlete(user, result.snapshot.athleteId))) {
      console.warn(JSON.stringify({ capabilityKey: ATHLETEIQ_CHECK_IN_CAPABILITY_KEY, event: "athleteiq.checkin.authorization_denied", correlationId }));
      return athleteIqJsonError("FORBIDDEN", 403, correlationId);
    }

    const { professionalSnapshot, snapshot, sharedDailySnapshot } = await upsertAthleteIqCheckInWithSharedDailyMirror(result.snapshot);
    if (result.highPain) {
      await logAuditEvent({
        actorEmail: user.email,
        actorRole: user.primaryRole,
        action: "checkin.create",
        resourceType: "athleteiq_checkin_safety_event",
        resourceId: snapshot.athleteId,
        metadata: {
          capabilityKey: ATHLETEIQ_CHECK_IN_CAPABILITY_KEY,
          event: "athleteiq.checkin.high_pain_reported",
          correlationId,
          localDate: snapshot.localDate,
          mode: snapshot.mode
        }
      });
      console.info(JSON.stringify({ capabilityKey: ATHLETEIQ_CHECK_IN_CAPABILITY_KEY, event: "athleteiq.checkin.high_pain_reported", correlationId, athleteId: snapshot.athleteId, localDate: snapshot.localDate }));
    }
    console.info(JSON.stringify({ capabilityKey: ATHLETEIQ_CHECK_IN_CAPABILITY_KEY, event: "athleteiq.checkin.submitted", correlationId, mode: snapshot.mode, localDate: snapshot.localDate }));

    const engineRun = await runAthleteIqDailyEngine({
      athleteId: snapshot.athleteId,
      localDate: snapshot.localDate,
      timezone: snapshot.timezone,
      mode: snapshot.mode,
      sourceEvent: "check_in_submitted",
      idempotencyKey: snapshot.idempotencyKey || `${snapshot.athleteId}:${snapshot.localDate}:${snapshot.mode}`,
      actor: {
        email: user.email,
        name: user.name,
        role: user.primaryRole
      }
    });

    return NextResponse.json({
      snapshot,
      professionalSnapshot,
      sharedDailySnapshot,
      engineRun,
      highPain: result.highPain,
      correlationId,
      generatedAt: new Date().toISOString(),
      latencyMs: Date.now() - startedAt
    });
  } catch (error) {
    return athleteIqJsonError("UNKNOWN_ERROR", 500, correlationId, { retryable: true, details: (error as Error).message });
  }
}
