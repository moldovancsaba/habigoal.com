import { NextResponse } from "next/server";
import { requireHabigoalApiUser } from "@/lib/access";
import { readJson } from "@/lib/api";
import { createHabigoalCorrelationId, habigoalJsonError, logHabigoalEvent } from "@/lib/habigoal-api";
import { getHabigoalTodayProjection, type HabigoalHabitKey } from "@/services/habigoal-product.service";
import { runMirroredAthleteIqDailyEngine } from "@/services/athleteiq-daily-engine.service";
import { patchSharedDailyState, SharedDailyStateError } from "@/services/shared-daily-state.service";

type DailyOperationBody = {
  athleteId?: unknown;
  habits?: unknown;
  idempotencyKey?: unknown;
  localDate?: unknown;
  timezone?: unknown;
  values?: unknown;
};

const HABIT_KEYS: HabigoalHabitKey[] = ["hydrate", "move", "fuel", "reflect", "sleep", "study"];

export async function POST(request: Request) {
  const correlationId = createHabigoalCorrelationId();
  const startedAt = Date.now();
  const operationId = `hbg-op-${crypto.randomUUID()}`;
  const user = await requireHabigoalApiUser();

  if (!user) {
    return habigoalJsonError("AUTH_REQUIRED", 401, correlationId, { retryable: true });
  }

  logHabigoalEvent("habigoal.daily_operation.start", {
    correlationId,
    operationId,
    status: "start",
    userEmail: user.email
  });

  try {
    const body = (await readJson(request)) as DailyOperationBody | null;
    const athleteId = stringValue(body?.athleteId, 120);
    const timezone = stringValue(body?.timezone, 80) || "Europe/Budapest";
    const idempotencyKey = stringValue(body?.idempotencyKey, 180) || `${athleteId || "self"}:${operationId}`;
    const localDate = stringValue(body?.localDate, 10);
    const values = normalizeValues(body?.values);
    const completedHabits = normalizeHabitKeys(body?.habits);

    if (localDate && !isDateOnly(localDate)) {
      return fail("VALIDATION_ERROR", 400, correlationId, operationId, startedAt, "localDate must use YYYY-MM-DD");
    }

    const missingValues = Object.entries(values).filter(([, value]) => value === null).map(([key]) => key);
    if (missingValues.length > 0) {
      return fail("VALIDATION_ERROR", 400, correlationId, operationId, startedAt, `missing values: ${missingValues.join(", ")}`);
    }

    const sharedState = await patchSharedDailyState({
      athleteId,
      habits: completedHabits,
      idempotencyKey,
      localDate: localDate || undefined,
      product: "habigoal",
      timezone,
      user,
      values: {
        energy: values.energy as number,
        mood: values.mood as number,
        sleep: values.sleep as number,
        soreness: values.soreness as number
      }
    });

    const mirroredEngine = await runMirroredAthleteIqDailyEngine({
      actor: {
        email: user.email,
        name: user.name,
        role: user.primaryRole
      },
      athleteId: sharedState.athleteId,
      idempotencyKey,
      localDate: sharedState.localDate,
      primaryMode: "lifestyle",
      sourceEvent: "check_in_submitted",
      timezone: sharedState.timezone
    });
    const projection = await getHabigoalTodayProjection({ timezone, user });

    logHabigoalEvent("habigoal.daily_operation.success", {
      athleteId: sharedState.athleteId,
      correlationId,
      durationMs: Date.now() - startedAt,
      operationId,
      status: "success",
      userEmail: user.email
    });

    return NextResponse.json({
      ok: true,
      operationId,
      status: "completed",
      projection,
      saved: {
        sharedDailyStateVersion: sharedState.version,
        sourceCollections: sharedState.dataFreshness.sourceCollections
      },
      engineRun: mirroredEngine.primary,
      engineRuns: {
        lifestyle: mirroredEngine.lifestyle,
        performance: mirroredEngine.performance
      },
      correlationId,
      generatedAt: new Date().toISOString(),
      latencyMs: Date.now() - startedAt
    });
  } catch (error) {
    if (error instanceof SharedDailyStateError) {
      return fail(error.code, error.code === "VALIDATION_ERROR" ? 400 : 403, correlationId, operationId, startedAt, error.message);
    }
    logHabigoalEvent("habigoal.daily_operation.failure", {
      correlationId,
      durationMs: Date.now() - startedAt,
      errorClass: "UNKNOWN_ERROR",
      operationId,
      retryable: true,
      status: "failure",
      userEmail: user.email
    });
    return habigoalJsonError("UNKNOWN_ERROR", 500, correlationId, {
      retryable: true,
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
}

function fail(
  code: "FORBIDDEN" | "PRODUCT_ACCESS_DENIED" | "VALIDATION_ERROR",
  status: number,
  correlationId: string,
  operationId: string,
  startedAt: number,
  details: unknown
) {
  logHabigoalEvent("habigoal.daily_operation.failure", {
    correlationId,
    durationMs: Date.now() - startedAt,
    errorClass: code,
    operationId,
    retryable: code !== "FORBIDDEN" && code !== "PRODUCT_ACCESS_DENIED",
    status: "failure"
  });
  return habigoalJsonError(code, status, correlationId, { details, retryable: code !== "FORBIDDEN" && code !== "PRODUCT_ACCESS_DENIED" });
}

function normalizeValues(input: unknown) {
  const values = input && typeof input === "object" ? input as Record<string, unknown> : {};
  return {
    energy: percentOrNull(values.energy),
    soreness: percentOrNull(values.soreness),
    mood: percentOrNull(values.mood),
    sleep: percentOrNull(values.sleep)
  };
}

function normalizeHabitKeys(input: unknown): HabigoalHabitKey[] {
  if (!Array.isArray(input)) return [];
  const allowed = new Set(HABIT_KEYS);
  return Array.from(new Set(input.filter((item): item is HabigoalHabitKey => allowed.has(item as HabigoalHabitKey))));
}

function percentOrNull(input: unknown) {
  const value = Number(input);
  if (!Number.isFinite(value)) return null;
  if (value < 0 || value > 100) return null;
  return Math.round(value);
}

function stringValue(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function isDateOnly(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}
