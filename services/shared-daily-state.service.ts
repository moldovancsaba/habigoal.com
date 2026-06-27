import { ObjectId } from "mongodb";
import { canAccessAthleteIqAthlete, canAccessHabigoalAthlete, canOpenProductSurface, type AuthUser } from "@/lib/access";
import { buildAthleteIqCheckInSnapshot, getLocalDateForTimezone } from "@/lib/athleteiq-check-in";
import { buildHabigoalDailyStatus } from "@/lib/habigoal-status";
import { getAthleteIqCheckInSnapshot, upsertAthleteIqCheckInSnapshot } from "@/repositories/athleteiq-check-in.repository";
import { getChildById } from "@/repositories/child.repository";
import { getHabitRecordByAthleteIdAndDate, upsertHabitRecord } from "@/repositories/habit-records.repository";
import { ensureCanonicalAthleteProfileForUser } from "@/services/shared-athlete-profile.service";
import { getHabigoalHabitStatuses, type HabigoalHabitKey } from "@/services/habigoal-product.service";

export type SharedDailyProduct = "habigoal" | "athlete-iq";

export type SharedDailyStateProjection = {
  athleteId: string;
  athleteName: string | null;
  checkIn: {
    energy: number | null;
    mood: number | null;
    sleep: number | null;
    soreness: number | null;
  };
  dataFreshness: {
    generatedAt: string;
    sourceCollections: string[];
  };
  habits: {
    completed: HabigoalHabitKey[];
    total: number;
  };
  localDate: string;
  product: SharedDailyProduct;
  status: ReturnType<typeof buildHabigoalDailyStatus>;
  timezone: string;
  version: string;
};

export type SharedDailyStatePatch = {
  athleteId?: string;
  localDate?: string;
  product: SharedDailyProduct;
  timezone?: string;
  values?: Partial<SharedDailyStateProjection["checkIn"]>;
  habits?: HabigoalHabitKey[];
  idempotencyKey?: string;
};

const DEFAULT_TIMEZONE = "Europe/Budapest";
const HABIT_KEYS: HabigoalHabitKey[] = ["hydrate", "move", "fuel", "reflect", "sleep", "study"];

export async function getSharedDailyState(input: {
  athleteId?: string;
  localDate?: string;
  product: SharedDailyProduct;
  timezone?: string;
  user: AuthUser;
}): Promise<SharedDailyStateProjection> {
  const timezone = input.timezone || DEFAULT_TIMEZONE;
  const localDate = input.localDate || getLocalDateForTimezone(timezone);
  const athlete = await resolveDailyStateAthlete({ athleteId: input.athleteId, product: input.product, user: input.user });
  const [checkIn, habitRecord] = await Promise.all([
    getAthleteIqCheckInSnapshot(athlete.athleteId, localDate, "lifestyle"),
    getHabitRecordByAthleteIdAndDate(athlete.athleteId, localDate)
  ]);
  const values = {
    energy: valueOrNull(invert(checkIn?.values.fatigue?.normalizedValue)),
    mood: valueOrNull(checkIn?.values.mood?.normalizedValue),
    sleep: valueOrNull(checkIn?.values.sleepQuality?.normalizedValue),
    soreness: valueOrNull(checkIn?.values.pain?.normalizedValue)
  };
  const completed = habitRecord
    ? (Object.entries({
        hydrate: "hydration",
        move: "mobility",
        fuel: "nutrition",
        reflect: "recoverySession",
        sleep: "sleepBeforeMidnight",
        study: "tacticalLearning"
      } satisfies Record<HabigoalHabitKey, string>)
        .filter(([, dbKey]) => habitRecord.statuses[dbKey])
        .map(([key]) => key) as HabigoalHabitKey[])
    : [];
  const status = buildHabigoalDailyStatus({
    completedHabitCount: completed.length,
    hasLiveCheckIn: Boolean(checkIn),
    hasLiveHabits: Boolean(habitRecord),
    totalHabitCount: HABIT_KEYS.length,
    values
  });

  return {
    athleteId: athlete.athleteId,
    athleteName: athlete.athleteName,
    checkIn: values,
    dataFreshness: {
      generatedAt: new Date().toISOString(),
      sourceCollections: ["athleteiq_checkins", "habit_records"]
    },
    habits: {
      completed,
      total: HABIT_KEYS.length
    },
    localDate,
    product: input.product,
    status,
    timezone,
    version: "shared-daily-state-v1"
  };
}

export async function patchSharedDailyState(input: SharedDailyStatePatch & { user: AuthUser }) {
  const timezone = input.timezone || DEFAULT_TIMEZONE;
  const localDate = input.localDate || getLocalDateForTimezone(timezone);
  const athlete = await resolveDailyStateAthlete({ athleteId: input.athleteId, product: input.product, user: input.user });
  const writes: Array<Promise<unknown>> = [];
  const values = normalizePatchValues(input.values);

  if (values) {
    const result = buildAthleteIqCheckInSnapshot({
      athleteId: athlete.athleteId,
      idempotencyKey: input.idempotencyKey || `${input.product}:${athlete.athleteId}:${localDate}:shared-daily-state`,
      mode: "lifestyle",
      timezone,
      values: {
        sleepQuality: percentToTenPoint(values.sleep),
        fatigue: percentToTenPoint(100 - values.energy),
        pain: percentToTenPoint(values.soreness),
        stress: percentToTenPoint(100 - values.mood),
        mood: percentToTenPoint(values.mood)
      }
    });
    if (!result.snapshot) {
      throw new SharedDailyStateError("VALIDATION_ERROR", result.errors.join(", "));
    }
    writes.push(upsertAthleteIqCheckInSnapshot({
      ...result.snapshot,
      localDate,
      auditHistory: [...result.snapshot.auditHistory, `shared-daily-state:${input.product}:${new Date().toISOString()}`]
    }));
  }

  if (Array.isArray(input.habits)) {
    writes.push(upsertHabitRecord({
      athleteId: athlete.athleteId,
      date: localDate,
      statuses: getHabigoalHabitStatuses(normalizeHabitKeys(input.habits))
    }));
  }

  await Promise.all(writes);
  return getSharedDailyState({ athleteId: athlete.athleteId, localDate, product: input.product, timezone, user: input.user });
}

export class SharedDailyStateError extends Error {
  constructor(public code: "FORBIDDEN" | "PRODUCT_ACCESS_DENIED" | "VALIDATION_ERROR", message: string) {
    super(message);
  }
}

async function resolveDailyStateAthlete(input: {
  athleteId?: string;
  product: SharedDailyProduct;
  user: AuthUser;
}) {
  const surface = input.product;
  if (!canOpenProductSurface(input.user, surface)) {
    throw new SharedDailyStateError("PRODUCT_ACCESS_DENIED", `${surface} access is not enabled`);
  }

  if (input.athleteId) {
    const allowed = surface === "habigoal"
      ? await canAccessHabigoalAthlete(input.user, input.athleteId)
      : await canAccessAthleteIqAthlete(input.user, input.athleteId);
    if (!allowed) throw new SharedDailyStateError("FORBIDDEN", "athlete access denied");
    const athlete = ObjectId.isValid(input.athleteId) ? await getChildById(new ObjectId(input.athleteId)) : null;
    return { athleteId: input.athleteId, athleteName: athlete?.name ?? null };
  }

  if (input.user.primaryRole !== "athlete") {
    throw new SharedDailyStateError("VALIDATION_ERROR", "athleteId is required for non-athlete sessions");
  }
  const result = await ensureCanonicalAthleteProfileForUser({ user: input.user });
  if (!result.athlete._id) throw new SharedDailyStateError("VALIDATION_ERROR", "athlete profile is not ready");
  return { athleteId: result.athlete._id, athleteName: result.athlete.name ?? null };
}

function normalizePatchValues(input: unknown) {
  if (!input || typeof input !== "object") return null;
  const values = input as Record<string, unknown>;
  const normalized = {
    energy: percent(values.energy),
    mood: percent(values.mood),
    sleep: percent(values.sleep),
    soreness: percent(values.soreness)
  };
  if (Object.values(normalized).every((value) => value !== null)) return normalized as Record<keyof typeof normalized, number>;
  throw new SharedDailyStateError("VALIDATION_ERROR", "energy, mood, sleep, and soreness must be 0-100");
}

function normalizeHabitKeys(input: unknown): HabigoalHabitKey[] {
  if (!Array.isArray(input)) return [];
  const allowed = new Set(HABIT_KEYS);
  return Array.from(new Set(input.filter((item): item is HabigoalHabitKey => allowed.has(item as HabigoalHabitKey))));
}

function percent(input: unknown) {
  const value = Number(input);
  if (!Number.isFinite(value) || value < 0 || value > 100) return null;
  return Math.round(value);
}

function percentToTenPoint(value: number) {
  return Math.max(1, Math.min(10, Math.round((Math.max(0, Math.min(100, value)) / 100) * 9 + 1)));
}

function valueOrNull(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? Math.round(value) : null;
}

function invert(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? 100 - value : null;
}
