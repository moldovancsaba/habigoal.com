import { NextResponse } from "next/server";
import { canAccessHabigoalAthlete, canOpenProductSurface, getAuthUser } from "@/lib/access";
import { readJson } from "@/lib/api";
import { buildAthleteIqCheckInSnapshot } from "@/lib/athleteiq-check-in";
import { createHabigoalCorrelationId, habigoalJsonError, logHabigoalEvent } from "@/lib/habigoal-api";
import { getHabigoalHabitStatuses, getHabigoalTodayProjection, type HabigoalHabitKey } from "@/services/habigoal-product.service";
import { upsertAthleteIqCheckInSnapshot } from "@/repositories/athleteiq-check-in.repository";
import { upsertHabitRecord } from "@/repositories/habit-records.repository";
import { runAthleteIqDailyEngine } from "@/services/athleteiq-daily-engine.service";

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
  const user = await getAuthUser();

  if (!user) {
    return habigoalJsonError("AUTH_REQUIRED", 401, correlationId, { retryable: true });
  }

  if (!canOpenProductSurface(user, "habigoal")) {
    return habigoalJsonError("PRODUCT_ACCESS_DENIED", 403, correlationId, { retryable: false });
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
    const idempotencyKey = stringValue(body?.idempotencyKey, 180) || `${athleteId}:${operationId}`;
    const localDate = stringValue(body?.localDate, 10);
    const values = normalizeValues(body?.values);
    const completedHabits = normalizeHabitKeys(body?.habits);

    if (!athleteId) {
      return fail("VALIDATION_ERROR", 400, correlationId, operationId, startedAt, "athleteId is required");
    }

    if (!(await canAccessHabigoalAthlete(user, athleteId))) {
      return fail("FORBIDDEN", 403, correlationId, operationId, startedAt, "athlete access denied");
    }

    const missingValues = Object.entries(values).filter(([, value]) => value === null).map(([key]) => key);
    if (missingValues.length > 0) {
      return fail("VALIDATION_ERROR", 400, correlationId, operationId, startedAt, `missing values: ${missingValues.join(", ")}`);
    }

    const checkInResult = buildAthleteIqCheckInSnapshot({
      athleteId,
      mode: "lifestyle",
      timezone,
      idempotencyKey,
      values: {
        sleepQuality: percentToTenPoint(values.sleep as number),
        fatigue: percentToTenPoint(100 - (values.energy as number)),
        pain: percentToTenPoint(values.soreness as number),
        stress: percentToTenPoint(100 - (values.mood as number)),
        mood: percentToTenPoint(values.mood as number)
      }
    });

    if (!checkInResult.snapshot) {
      return fail("VALIDATION_ERROR", 400, correlationId, operationId, startedAt, checkInResult.errors);
    }

    const saveDate = localDate || checkInResult.snapshot.localDate;
    const statuses = getHabigoalHabitStatuses(completedHabits);
    const [habitRecord, snapshot] = await Promise.all([
      upsertHabitRecord({ athleteId, date: saveDate, statuses }),
      upsertAthleteIqCheckInSnapshot(checkInResult.snapshot)
    ]);

    const engineRun = await runAthleteIqDailyEngine({
      actor: {
        email: user.email,
        name: user.name,
        role: user.primaryRole
      },
      athleteId,
      idempotencyKey,
      localDate: snapshot.localDate,
      mode: snapshot.mode,
      sourceEvent: "check_in_submitted",
      timezone: snapshot.timezone
    });
    const projection = await getHabigoalTodayProjection({ timezone, user });

    logHabigoalEvent("habigoal.daily_operation.success", {
      athleteId,
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
        checkInId: snapshot.id,
        habitRecordId: habitRecord._id
      },
      engineRun,
      correlationId,
      generatedAt: new Date().toISOString(),
      latencyMs: Date.now() - startedAt
    });
  } catch (error) {
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
  code: "FORBIDDEN" | "VALIDATION_ERROR",
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
    retryable: code !== "FORBIDDEN",
    status: "failure"
  });
  return habigoalJsonError(code, status, correlationId, { details, retryable: code !== "FORBIDDEN" });
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

function percentToTenPoint(value: number) {
  const clamped = Math.max(0, Math.min(100, value));
  return Math.max(1, Math.min(10, Math.round((clamped / 100) * 9 + 1)));
}

function stringValue(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}
