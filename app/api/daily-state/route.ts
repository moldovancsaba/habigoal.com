import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/access";
import { athleteIqJsonError, createAthleteIqCorrelationId } from "@/lib/athleteiq-api";
import { readJson } from "@/lib/api";
import { runAthleteIqDailyEngine } from "@/services/athleteiq-daily-engine.service";
import { getSharedDailyState, patchSharedDailyState, SharedDailyStateError, type SharedDailyProduct } from "@/services/shared-daily-state.service";

export async function GET(request: Request) {
  const correlationId = createAthleteIqCorrelationId();
  const startedAt = Date.now();
  const user = await getAuthUser();
  if (!user) return athleteIqJsonError("AUTH_REQUIRED", 401, correlationId, { retryable: true });

  try {
    const { searchParams } = new URL(request.url);
    const product = normalizeProduct(searchParams.get("product"));
    if (!product) return athleteIqJsonError("VALIDATION_ERROR", 400, correlationId, { details: ["product must be habigoal or athlete-iq"] });
    const localDate = searchParams.get("date")?.trim() || undefined;
    if (localDate && !isDateOnly(localDate)) return athleteIqJsonError("VALIDATION_ERROR", 400, correlationId, { details: ["date must use YYYY-MM-DD"] });
    const projection = await getSharedDailyState({
      athleteId: searchParams.get("athleteId")?.trim() || undefined,
      localDate,
      product,
      timezone: searchParams.get("timezone")?.trim() || undefined,
      user
    });
    console.info(JSON.stringify({
      event: "shared_daily_state.loaded",
      athleteIdHash: hashForLog(projection.athleteId),
      correlationId,
      latencyMs: Date.now() - startedAt,
      product,
      sourceCollections: projection.dataFreshness.sourceCollections
    }));
    return NextResponse.json({ projection, correlationId, generatedAt: new Date().toISOString(), latencyMs: Date.now() - startedAt });
  } catch (error) {
    return sharedDailyStateError(error, correlationId);
  }
}

export async function PATCH(request: Request) {
  const correlationId = createAthleteIqCorrelationId();
  const startedAt = Date.now();
  const user = await getAuthUser();
  if (!user) return athleteIqJsonError("AUTH_REQUIRED", 401, correlationId, { retryable: true });

  try {
    const body = await readJson(request) as Record<string, unknown> | null;
    const product = normalizeProduct(body?.product);
    if (!product) return athleteIqJsonError("VALIDATION_ERROR", 400, correlationId, { details: ["product must be habigoal or athlete-iq"] });
    const localDate = typeof body?.localDate === "string" ? body.localDate.trim() : undefined;
    if (localDate && !isDateOnly(localDate)) return athleteIqJsonError("VALIDATION_ERROR", 400, correlationId, { details: ["localDate must use YYYY-MM-DD"] });
    const projection = await patchSharedDailyState({
      athleteId: typeof body?.athleteId === "string" ? body.athleteId : undefined,
      habits: Array.isArray(body?.habits) ? body.habits as never : undefined,
      idempotencyKey: typeof body?.idempotencyKey === "string" ? body.idempotencyKey : undefined,
      localDate,
      product,
      timezone: typeof body?.timezone === "string" ? body.timezone : undefined,
      user,
      values: body?.values && typeof body.values === "object" ? body.values as never : undefined
    });
    const engineRun = await runAthleteIqDailyEngine({
      actor: {
        email: user.email,
        name: user.name,
        role: user.primaryRole
      },
      athleteId: projection.athleteId,
      idempotencyKey: typeof body?.idempotencyKey === "string" ? body.idempotencyKey : undefined,
      localDate: projection.localDate,
      mode: "lifestyle",
      sourceEvent: "check_in_submitted",
      timezone: projection.timezone
    });
    console.info(JSON.stringify({
      event: "shared_daily_state.patched",
      athleteIdHash: hashForLog(projection.athleteId),
      correlationId,
      enginePartialFailureCount: engineRun.partialFailures.length,
      latencyMs: Date.now() - startedAt,
      product
    }));
    return NextResponse.json({ ok: true, projection, engineRun, correlationId, generatedAt: new Date().toISOString(), latencyMs: Date.now() - startedAt });
  } catch (error) {
    return sharedDailyStateError(error, correlationId);
  }
}

function normalizeProduct(input: unknown): SharedDailyProduct | null {
  return input === "habigoal" || input === "athlete-iq" ? input : null;
}

function isDateOnly(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function sharedDailyStateError(error: unknown, correlationId: string) {
  if (error instanceof SharedDailyStateError) {
    const status = error.code === "VALIDATION_ERROR" ? 400 : 403;
    return athleteIqJsonError(error.code, status, correlationId, { details: [error.message], retryable: false });
  }
  return athleteIqJsonError("UNKNOWN_ERROR", 500, correlationId, {
    details: error instanceof Error ? error.message : "Unknown error",
    retryable: true
  });
}

function hashForLog(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = Math.imul(31, hash) + value.charCodeAt(index) | 0;
  }
  return `s${Math.abs(hash).toString(36)}`;
}
