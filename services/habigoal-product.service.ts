import { ObjectId } from "mongodb";
import { getAuthUser, resolveAccessibleAthleteIds, type AuthUser } from "@/lib/access";
import { getLocalDateForTimezone } from "@/lib/athleteiq-check-in";
import { getAthleteIqCheckInSnapshot } from "@/repositories/athleteiq-check-in.repository";
import { getChildById, listChildren } from "@/repositories/child.repository";
import { getHabitRecordByAthleteIdAndDate } from "@/repositories/habit-records.repository";

export type HabigoalHabitKey = "hydrate" | "move" | "fuel" | "reflect" | "sleep" | "study";

export type HabigoalTodayProjection = {
  athleteId: string | null;
  athleteName: string | null;
  localDate: string;
  timezone: string;
  values: {
    energy: number;
    soreness: number;
    mood: number;
    sleep: number;
  };
  completedHabits: HabigoalHabitKey[];
  hasLiveCheckIn: boolean;
  hasLiveHabits: boolean;
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
  const user = input.user === undefined ? await getAuthUser() : input.user;
  const athlete = user ? await resolveHabigoalAthlete(user) : null;
  if (!athlete?._id) {
    return emptyProjection({ localDate, timezone });
  }
  const athleteId = athlete._id;

  const [checkIn, habitRecord] = await Promise.all([
    getAthleteIqCheckInSnapshot(athleteId, localDate, "lifestyle"),
    getHabitRecordByAthleteIdAndDate(athleteId, localDate)
  ]);

  return {
    athleteId,
    athleteName: athlete.name,
    localDate,
    timezone,
    values: {
      energy: valueOrEmpty(invert(checkIn?.values.fatigue?.normalizedValue)),
      soreness: valueOrEmpty(checkIn?.values.pain?.normalizedValue),
      mood: valueOrEmpty(checkIn?.values.mood?.normalizedValue),
      sleep: valueOrEmpty(checkIn?.values.sleepQuality?.normalizedValue)
    },
    completedHabits: habitRecord
      ? (Object.entries(habitDbKeyByHabigoalKey)
          .filter(([, dbKey]) => habitRecord.statuses[dbKey])
          .map(([key]) => key) as HabigoalHabitKey[])
      : [],
    hasLiveCheckIn: Boolean(checkIn),
    hasLiveHabits: Boolean(habitRecord)
  };
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

  const allowedIds = await resolveAccessibleAthleteIds(user);
  const children = await listChildren();
  if (allowedIds === null) return children[0] ?? null;
  return children.find((child) => child._id && allowedIds.includes(child._id)) ?? null;
}

function emptyProjection(input: { localDate: string; timezone: string }): HabigoalTodayProjection {
  return {
    athleteId: null,
    athleteName: null,
    localDate: input.localDate,
    timezone: input.timezone,
    values: {
      energy: 0,
      soreness: 0,
      mood: 0,
      sleep: 0
    },
    completedHabits: [],
    hasLiveCheckIn: false,
    hasLiveHabits: false
  };
}

function valueOrEmpty(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? Math.round(value) : 0;
}

function invert(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? 100 - value : null;
}
