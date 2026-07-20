import { NextResponse } from "next/server";
import { canAccessAthlete, getAuthUser } from "@/lib/access";
import { readJson } from "@/lib/api";
import { athleteIqJsonError, createAthleteIqCorrelationId } from "@/lib/athleteiq-api";
import { ATHLETEIQ_DAILY_ENGINE_CAPABILITY_KEY, runAthleteIqDailyEngine, validateDailyEngineInput } from "@/services/athleteiq-daily-engine.service";
import type { DailyEngineSourceEvent } from "@/types/athleteiq-daily-engine";

function sourceEventValue(value: unknown): DailyEngineSourceEvent {
  return value === "check_in_submitted" || value === "scheduled_rebuild" ? value : "manual_recalculate";
}

export async function POST(request: Request) {
  const correlationId = createAthleteIqCorrelationId();
  const startedAt = Date.now();
  const user = await getAuthUser({ productSurface: "athlete-iq" });
  if (!user) return athleteIqJsonError("AUTH_REQUIRED", 401, correlationId, { retryable: true });

  try {
    const body = (await readJson(request)) as {
      athleteId?: string;
      localDate?: string;
      timezone?: string;
      mode?: "lifestyle" | "performance";
      sourceEvent?: DailyEngineSourceEvent;
      idempotencyKey?: string;
    } | null;
    const athleteId = typeof body?.athleteId === "string" ? body.athleteId.trim() : "";
    const input = {
      athleteId,
      localDate: body?.localDate,
      timezone: body?.timezone,
      mode: body?.mode,
      sourceEvent: sourceEventValue(body?.sourceEvent),
      idempotencyKey: body?.idempotencyKey,
      actor: {
        email: user.email,
        name: user.name,
        role: user.primaryRole
      }
    };
    const errors = validateDailyEngineInput(input);
    if (errors.length) return athleteIqJsonError("VALIDATION_ERROR", 400, correlationId, { details: errors });
    if (!(await canAccessAthlete(user, athleteId))) return athleteIqJsonError("FORBIDDEN", 403, correlationId);

    const run = await runAthleteIqDailyEngine(input);
    console.info(JSON.stringify({
      capabilityKey: ATHLETEIQ_DAILY_ENGINE_CAPABILITY_KEY,
      event: "athleteiq.daily_engine.run",
      correlationId,
      athleteId,
      localDate: run.localDate,
      mode: run.mode,
      partialFailureCount: run.partialFailures.length,
      latencyMs: Date.now() - startedAt
    }));

    return NextResponse.json({
      run,
      correlationId,
      generatedAt: new Date().toISOString(),
      latencyMs: Date.now() - startedAt
    });
  } catch (error) {
    return athleteIqJsonError("UNKNOWN_ERROR", 500, correlationId, { retryable: true, details: (error as Error).message });
  }
}
