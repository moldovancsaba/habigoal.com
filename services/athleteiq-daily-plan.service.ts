import { buildDailyPlan } from "@/lib/athleteiq-daily-plan";
import { getLocalDateForTimezone } from "@/lib/athleteiq-check-in";
import { getDailyPlanByDate, updateDailyPlanTask, upsertDailyPlan } from "@/repositories/athleteiq-daily-plan.repository";
import { getLatestDailyIqSnapshot } from "@/repositories/athleteiq-daily-iq.repository";
import { getHabitRecordByAthleteIdAndDate } from "@/repositories/habit-records.repository";
import { getMentalEdgeToday } from "@/services/athleteiq-mental-edge.service";
import { getPainGuardrailToday } from "@/services/athleteiq-pain-safety.service";
import type { DailyTaskCompletionState } from "@/types/athleteiq-daily-plan";

export async function generateDailyPlan(input: {
  athleteId: string;
  timezone?: string;
  localDate?: string;
}) {
  const timezone = input.timezone || "UTC";
  const localDate = input.localDate || getLocalDateForTimezone(timezone);
  const [dailyIq, mentalEdge, painGuardrail, habitRecord, previousPlan] = await Promise.all([
    getLatestDailyIqSnapshot({ athleteId: input.athleteId, localDate }),
    getMentalEdgeToday({ athleteId: input.athleteId, timezone, localDate }),
    getPainGuardrailToday({ athleteId: input.athleteId, timezone, localDate }),
    getHabitRecordByAthleteIdAndDate(input.athleteId, localDate),
    getDailyPlanByDate(input.athleteId, localDate)
  ]);

  const plan = buildDailyPlan({ athleteId: input.athleteId, localDate, timezone, dailyIq, mentalEdge, painGuardrail, habitRecord, previousPlan });
  return upsertDailyPlan(plan);
}

export async function getTodayDailyPlan(input: {
  athleteId: string;
  timezone?: string;
  localDate?: string;
}) {
  const timezone = input.timezone || "UTC";
  const localDate = input.localDate || getLocalDateForTimezone(timezone);
  return getDailyPlanByDate(input.athleteId, localDate);
}

export async function updateDailyPlanTaskState(input: {
  athleteId: string;
  localDate: string;
  taskId: string;
  completionState: DailyTaskCompletionState;
  actorEmail: string;
}) {
  return updateDailyPlanTask(input);
}
