import type { AuthUser } from "@/lib/access";
import { getHabigoalTodayProjection } from "@/services/habigoal-product.service";
import { listReflectionsByDay } from "@/repositories/athleteiq-reflection.repository";
import type { DailyCompletion, ReminderKey, ReminderPreferences } from "@/types/reminder";

// Pure: which of today's daily actions are still outstanding. Order is the
// natural daily flow (check-in → habits → reflection).
export function deriveReminders(completion: DailyCompletion): ReminderKey[] {
  const due: ReminderKey[] = [];
  if (!completion.checkInDone) due.push("checkin");
  if (!completion.habitsDone) due.push("habits");
  if (!completion.reflectionDone) due.push("reflection");
  return due;
}

// Pure: is the given local hour inside the quiet-hours window? A window where
// start === end is treated as "no quiet hours". start > end wraps past midnight.
export function isWithinQuietHours(
  localHour: number,
  quietHours?: ReminderPreferences["quietHours"]
): boolean {
  if (!quietHours) return false;
  const { start, end } = quietHours;
  if (start === end) return false;
  return start < end
    ? localHour >= start && localHour < end
    : localHour >= start || localHour < end;
}

// Pure: apply delivery policy to the outstanding nudges. During quiet hours no
// nudge surfaces; otherwise an optional cadence cap bounds how many are shown.
// With no preferences this is the identity over `due`, preserving lite behaviour.
export function applyReminderPolicy(
  due: ReminderKey[],
  opts: { localHour: number; preferences?: ReminderPreferences }
): ReminderKey[] {
  const { localHour, preferences } = opts;
  if (isWithinQuietHours(localHour, preferences?.quietHours)) return [];
  const cap = preferences?.maxConcurrent;
  return typeof cap === "number" && cap >= 0 ? due.slice(0, cap) : due;
}

// The local clock-hour [0,24) in the given IANA timezone, falling back to the
// server's local hour when the timezone is missing or invalid.
export function localHourInTimezone(timezone: string | undefined, now: Date = new Date()): number {
  try {
    const formatted = new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hour12: false,
      timeZone: timezone,
    }).format(now);
    const hour = Number(formatted);
    return Number.isFinite(hour) ? hour % 24 : now.getHours();
  } catch {
    return now.getHours();
  }
}

// Resolves today's completion for the signed-in athlete and returns the
// outstanding nudges after applying the delivery policy (quiet hours + cadence).
// Computed on read from existing daily state — no scheduler. With no preferences
// the result matches the prior lite behaviour.
export async function getDueReminders(
  user: AuthUser,
  opts: { timezone?: string; preferences?: ReminderPreferences } = {}
): Promise<ReminderKey[]> {
  const { timezone, preferences } = opts;
  const projection = await getHabigoalTodayProjection({ user, timezone });
  if (!projection.athleteId) return [];

  let reflectionDone = false;
  try {
    const reflections = await listReflectionsByDay({ athleteId: projection.athleteId, localDate: projection.localDate });
    reflectionDone = reflections.length > 0;
  } catch {
    reflectionDone = false;
  }

  const due = deriveReminders({
    checkInDone: projection.hasLiveCheckIn,
    habitsDone: projection.hasLiveHabits,
    reflectionDone
  });

  return applyReminderPolicy(due, { localHour: localHourInTimezone(timezone), preferences });
}
