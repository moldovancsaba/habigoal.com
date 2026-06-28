import { ObjectId } from "mongodb";
import { getAuthUser, type AuthUser } from "@/lib/access";
import { getLocalDateForTimezone } from "@/lib/athleteiq-check-in";
import { atLeastOneHabitCompleted, computeBestStreak, computeCurrentStreak, getHabitCompletion } from "@/lib/athlete-habits";
import { createHabigoalCorrelationId, logHabigoalEvent } from "@/lib/habigoal-api";
import { buildHabigoalDailyStatus, type HabigoalConfidence, type HabigoalDailyStatus, type HabigoalMetricValues } from "@/lib/habigoal-status";
import { getAthleteIqCheckInSnapshot } from "@/repositories/athleteiq-check-in.repository";
import { getChildById } from "@/repositories/child.repository";
import { getHabitRecordByAthleteIdAndDate, listHabitRecordsByAthleteId } from "@/repositories/habit-records.repository";
import { ensureCanonicalAthleteProfileForUser } from "@/services/shared-athlete-profile.service";

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

export type HabigoalHistoryDay = { date: string; score: number };
export type HabigoalHistory = {
  currentStreak: number;
  bestStreak: number;
  activeDays: number;
  last7Days: HabigoalHistoryDay[];
};

// Recent habit history for the Habigoal "build your habits" view. Habigoal is a
// white-label of AthleteIQ, so this borrows the AIQ-owned habit functions
// (lib/athlete-habits) over the shared habit_records store — the same streak and
// completion math AIQ shows for the same athlete, kept consistent across both apps.
export async function getHabigoalRecentHistory(input: { timezone?: string; user?: AuthUser | null } = {}): Promise<HabigoalHistory> {
  const timezone = input.timezone || DEFAULT_TIMEZONE;
  const localDate = getLocalDateForTimezone(timezone);
  const user = input.user === undefined ? await getAuthUser() : input.user;
  const athlete = user ? await resolveHabigoalAthlete(user) : null;

  if (!athlete?._id) {
    return { currentStreak: 0, bestStreak: 0, activeDays: 0, last7Days: buildLast7Days(localDate, new Map()) };
  }

  const records = await listHabitRecordsByAthleteId(athlete._id);
  const byDate = new Map(records.map((record) => [record.date, record]));

  // Habigoal's streak rule matches its copy and the last-7-days chart: a day
  // counts when at least one habit is completed, over consecutive calendar days
  // anchored to today (#426). The previous >=70%-of-9 rule was unreachable for
  // the 6-habit Habigoal set, so the streak was always 0 while the chart showed
  // active days.
  const currentStreak = computeCurrentStreak(records, localDate, atLeastOneHabitCompleted);
  const bestStreak = computeBestStreak(records, atLeastOneHabitCompleted);

  let activeDays = 0;
  for (let offset = 0; offset < 14; offset += 1) {
    const record = byDate.get(shiftIsoDate(localDate, -offset));
    if (record && getHabitCompletion(record.statuses).completed > 0) activeDays += 1;
  }

  return { currentStreak, bestStreak, activeDays, last7Days: buildLast7Days(localDate, byDate) };
}

function buildLast7Days(localDate: string, byDate: Map<string, { statuses: Record<string, boolean> }>): HabigoalHistoryDay[] {
  const days: HabigoalHistoryDay[] = [];
  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = shiftIsoDate(localDate, -offset);
    const record = byDate.get(date);
    days.push({ date, score: record ? getHabitCompletion(record.statuses).score : 0 });
  }
  return days;
}

function shiftIsoDate(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function getHabigoalHabitStatuses(completedHabits: HabigoalHabitKey[]) {
  const completed = new Set(completedHabits);
  return Object.fromEntries(
    Object.entries(habitDbKeyByHabigoalKey).map(([key, dbKey]) => [dbKey, completed.has(key as HabigoalHabitKey)])
  ) as Record<string, boolean>;
}

async function resolveHabigoalAthlete(user: AuthUser) {
  // Habigoal is the consumer surface: it must resolve ONLY the signed-in
  // athlete's own profile (or a parent's own child). It must never fall back to
  // an arbitrary athlete — the previous "first of all athletes" fallback for
  // open-access roles (admin/analyst/club_management) rendered another person's
  // name and data on the consumer surface, a cross-tenant PII leak (#432).
  // Non-consumer roles (trainer/admin/analyst) get the empty/missing_profile
  // projection; they manage athletes from the professional AIQ surface instead.
  const directId = user.primaryRole === "athlete"
    ? user.athleteId
    : user.primaryRole === "parent"
      ? user.parentAthleteIds?.[0]
      : undefined;
  if (directId && ObjectId.isValid(directId)) return getChildById(new ObjectId(directId));

  if (user.primaryRole === "athlete") {
    const result = await ensureCanonicalAthleteProfileForUser({ user });
    return result.athlete;
  }

  return null;
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
