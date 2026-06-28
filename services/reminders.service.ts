import type { AuthUser } from "@/lib/access";
import { getHabigoalTodayProjection } from "@/services/habigoal-product.service";
import { listReflectionsByDay } from "@/repositories/athleteiq-reflection.repository";
import type { DailyCompletion, ReminderKey } from "@/types/reminder";

// Pure: which of today's daily actions are still outstanding. Order is the
// natural daily flow (check-in → habits → reflection).
export function deriveReminders(completion: DailyCompletion): ReminderKey[] {
  const due: ReminderKey[] = [];
  if (!completion.checkInDone) due.push("checkin");
  if (!completion.habitsDone) due.push("habits");
  if (!completion.reflectionDone) due.push("reflection");
  return due;
}

// Resolves today's completion for the signed-in athlete and returns the
// outstanding nudges. Computed on read from existing daily state — no scheduler.
export async function getDueReminders(user: AuthUser, timezone?: string): Promise<ReminderKey[]> {
  const projection = await getHabigoalTodayProjection({ user, timezone });
  if (!projection.athleteId) return [];

  let reflectionDone = false;
  try {
    const reflections = await listReflectionsByDay({ athleteId: projection.athleteId, localDate: projection.localDate });
    reflectionDone = reflections.length > 0;
  } catch {
    reflectionDone = false;
  }

  return deriveReminders({
    checkInDone: projection.hasLiveCheckIn,
    habitsDone: projection.hasLiveHabits,
    reflectionDone
  });
}
