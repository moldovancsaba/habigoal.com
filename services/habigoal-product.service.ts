import { ObjectId } from "mongodb";
import { getAuthUser, resolveAccessibleAthleteIds, type AuthUser } from "@/lib/access";
import { getLocalDateForTimezone } from "@/lib/athleteiq-check-in";
import { createHabigoalCorrelationId, logHabigoalEvent } from "@/lib/habigoal-api";
import { buildHabigoalDailyStatus, type HabigoalConfidence, type HabigoalDailyStatus, type HabigoalMetricValues } from "@/lib/habigoal-status";
import { getAthleteIqCheckInSnapshot } from "@/repositories/athleteiq-check-in.repository";
import { createEmptyAthleteProfileForUser, findChildByUserIdentity, getChildById, listChildren } from "@/repositories/child.repository";
import { getHabitRecordByAthleteIdAndDate } from "@/repositories/habit-records.repository";
import { setUserAthleteId } from "@/repositories/user.repository";

export type HabigoalHabitKey = "hydrate" | "move" | "fuel" | "reflect" | "sleep" | "study";

export type HabigoalTodayProjection = {
  athleteId: string | null;
  athleteName: string | null;
  completedHabits: HabigoalHabitKey[];
  confidence: HabigoalConfidence;
  correlationId: string;
  dataState: "missing_profile" | "no_today_data" | "partial_today_data" | "ready";
  hasLiveCheckIn: boolean;
  hasLiveHabits: boolean;
  localDate: string;
  missingSignals: string[];
  nextActionKey: string;
  reasonCodes: string[];
  score: number | null;
  source: "atlas" | "authenticated-empty";
  status: HabigoalDailyStatus;
  timezone: string;
  values: HabigoalMetricValues;
};

const DEFAULT_TIMEZONE = "Europe/Budapest";
const habitDbKeyByHabigoalKey: Record<HabigoalHabitKey, string> = {
  hydrate: "hydration",
  move: "mobility",
  fuel: "nutrition",
  reflect: "recoverySession",
  sleep: "sleepBeforeMidnight",
  study: "tacticalLearning"
};

export async function getHabigoalTodayProjection(input: {
  timezone?: string;
  user?: AuthUser | null;
} = {}): Promise<HabigoalTodayProjection> {
  const timezone = input.timezone || DEFAULT_TIMEZONE;
  const localDate = getLocalDateForTimezone(timezone);
  const correlationId = createHabigoalCorrelationId();
  const startedAt = Date.now();
  const user = input.user === undefined ? await getAuthUser() : input.user;
  const athlete = user ? await resolveHabigoalAthlete(user) : null;

  if (!athlete?._id) {
    const projection = emptyProjection({ correlationId, dataState: "missing_profile", localDate, timezone });
    logHabigoalEvent("habigoal.projection.empty", {
      correlationId,
      durationMs: Date.now() - startedAt,
      status: "success",
      userEmail: user?.email
    });
    return projection;
  }

  const athleteId = athlete._id;
  const [checkIn, habitRecord] = await Promise.all([
    getAthleteIqCheckInSnapshot(athleteId, localDate, "lifestyle"),
    getHabitRecordByAthleteIdAndDate(athleteId, localDate)
  ]);
  const values = {
    energy: valueOrNull(invert(checkIn?.values.fatigue?.normalizedValue)),
    soreness: valueOrNull(checkIn?.values.pain?.normalizedValue),
    mood: valueOrNull(checkIn?.values.mood?.normalizedValue),
    sleep: valueOrNull(checkIn?.values.sleepQuality?.normalizedValue)
  };
  const completedHabits = habitRecord
    ? (Object.entries(habitDbKeyByHabigoalKey)
        .filter(([, dbKey]) => habitRecord.statuses[dbKey])
        .map(([key]) => key) as HabigoalHabitKey[])
    : [];
  const dailyStatus = buildHabigoalDailyStatus({
    completedHabitCount: completedHabits.length,
    hasLiveCheckIn: Boolean(checkIn),
    hasLiveHabits: Boolean(habitRecord),
    totalHabitCount: Object.keys(habitDbKeyByHabigoalKey).length,
    values
  });

  const projection: HabigoalTodayProjection = {
    athleteId,
    athleteName: athlete.name,
    completedHabits,
    correlationId,
    dataState: resolveDataState({
      hasAthlete: true,
      hasLiveCheckIn: Boolean(checkIn),
      hasLiveHabits: Boolean(habitRecord),
      missingSignals: dailyStatus.missingSignals
    }),
    hasLiveCheckIn: Boolean(checkIn),
    hasLiveHabits: Boolean(habitRecord),
    localDate,
    source: checkIn || habitRecord ? "atlas" : "authenticated-empty",
    timezone,
    values,
    ...dailyStatus
  };

  logHabigoalEvent("habigoal.projection.loaded", {
    athleteId,
    correlationId,
    durationMs: Date.now() - startedAt,
    status: "success",
    userEmail: user?.email
  });

  return projection;
}

export function getHabigoalHabitStatuses(completedHabits: HabigoalHabitKey[]) {
  const completed = new Set(completedHabits);
  return Object.fromEntries(
    Object.entries(habitDbKeyByHabigoalKey).map(([key, dbKey]) => [dbKey, completed.has(key as HabigoalHabitKey)])
  ) as Record<string, boolean>;
}

async function resolveHabigoalAthlete(user: AuthUser) {
  const directId = user.primaryRole === "athlete" ? user.athleteId : user.primaryRole === "parent" ? user.parentAthleteIds?.[0] : undefined;
  if (directId && ObjectId.isValid(directId)) return getChildById(new ObjectId(directId));

  if (user.primaryRole === "athlete") {
    const existing = await findChildByUserIdentity({ email: user.email, userId: user.id });
    if (existing?._id) {
      await setUserAthleteId(user.email, existing._id);
      return existing;
    }

    const created = await createEmptyAthleteProfileForUser({
      email: user.email,
      name: user.name || user.email,
      userId: user.id
    });
    if (created._id) await setUserAthleteId(user.email, created._id);
    return created;
  }

  const allowedIds = await resolveAccessibleAthleteIds(user);
  const children = await listChildren();
  if (allowedIds === null) return children[0] ?? null;
  return children.find((child) => child._id && allowedIds.includes(child._id)) ?? null;
}

function emptyProjection(input: {
  correlationId: string;
  dataState: HabigoalTodayProjection["dataState"];
  localDate: string;
  timezone: string;
}): HabigoalTodayProjection {
  return {
    athleteId: null,
    athleteName: null,
    completedHabits: [],
    confidence: "none",
    correlationId: input.correlationId,
    dataState: input.dataState,
    hasLiveCheckIn: false,
    hasLiveHabits: false,
    localDate: input.localDate,
    missingSignals: ["profile", "energy", "soreness", "mood", "sleep", "habits"],
    nextActionKey: "needs_input",
    reasonCodes: ["missing_profile"],
    score: null,
    source: "authenticated-empty",
    status: "needs_input",
    timezone: input.timezone,
    values: {
      energy: null,
      soreness: null,
      mood: null,
      sleep: null
    }
  };
}

function resolveDataState(input: {
  hasAthlete: boolean;
  hasLiveCheckIn: boolean;
  hasLiveHabits: boolean;
  missingSignals: string[];
}): HabigoalTodayProjection["dataState"] {
  if (!input.hasAthlete) return "missing_profile";
  if (!input.hasLiveCheckIn && !input.hasLiveHabits) return "no_today_data";
  if (input.missingSignals.length > 0) return "partial_today_data";
  return "ready";
}

function valueOrNull(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? Math.round(value) : null;
}

function invert(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? 100 - value : null;
}
