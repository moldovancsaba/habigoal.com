import { buildDayContext, buildDayEntry } from "@/lib/athleteiq-calendar";
import { listDayEntries, upsertDayEntry, getDayEntry, updateDayEntry, deleteDayEntry } from "@/repositories/athleteiq-calendar.repository";
import { getDailyPlanByDate } from "@/repositories/athleteiq-daily-plan.repository";
import { listAthleteIqSessions } from "@/repositories/athleteiq-session.repository";
import type { AthleteIqDayEntry, AthleteIqDayEntryType, AthleteIqDayEntryVisibility } from "@/types/athleteiq-calendar";

export async function getDailyRealityMap(input: { athleteId: string; localDate: string; timezone?: string }) {
  const timezone = input.timezone || "UTC";
  const [manualEntries, dailyPlan, sessions] = await Promise.all([
    listDayEntries({ athleteId: input.athleteId, localDate: input.localDate }),
    getDailyPlanByDate(input.athleteId, input.localDate),
    listAthleteIqSessions({ athleteId: input.athleteId, from: input.localDate, to: input.localDate })
  ]);
  return buildDayContext({ athleteId: input.athleteId, localDate: input.localDate, timezone, manualEntries, dailyPlan, sessions });
}

export async function createCalendarEntry(input: {
  athleteId: string;
  localDate: string;
  type: AthleteIqDayEntryType;
  titleKeyOrText: string;
  visibility?: AthleteIqDayEntryVisibility;
  startAt?: string;
  endAt?: string;
}) {
  return upsertDayEntry(buildDayEntry({ ...input, source: "manual" }));
}

export async function getCalendarEntry(id: string) {
  return getDayEntry(id);
}

export async function patchCalendarEntry(input: {
  entry: AthleteIqDayEntry;
  patch: Partial<Pick<AthleteIqDayEntry, "type" | "startAt" | "endAt" | "titleKeyOrText" | "visibility">>;
  actorEmail: string;
}) {
  return updateDayEntry(input);
}

export async function removeCalendarEntry(input: { entry: AthleteIqDayEntry; actorEmail: string }) {
  return deleteDayEntry(input);
}
