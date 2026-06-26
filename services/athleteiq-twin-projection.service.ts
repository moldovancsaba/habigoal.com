import { ObjectId } from "mongodb";
import type { AppRole } from "@/lib/access";
import { buildAthleteTwinProjection } from "@/lib/athleteiq-twin-projection";
import { getLocalDateForTimezone } from "@/lib/athleteiq-check-in";
import { getLatestDailyIqSnapshot } from "@/repositories/athleteiq-daily-iq.repository";
import { getDailyPlanByDate } from "@/repositories/athleteiq-daily-plan.repository";
import { upsertTwinProjectionSnapshot } from "@/repositories/athleteiq-twin-projection.repository";
import { getChildById } from "@/repositories/child.repository";
import { getHabitRecordByAthleteIdAndDate } from "@/repositories/habit-records.repository";
import { getMentalEdgeToday } from "@/services/athleteiq-mental-edge.service";
import { getPainGuardrailToday } from "@/services/athleteiq-pain-safety.service";
import type { AthleteTwinProjectionView } from "@/types/athleteiq-twin-projection";

export async function buildAthleteTwinProjectionForView(input: {
  athleteId: string;
  view: AthleteTwinProjectionView;
  viewerRole: AppRole;
  timezone?: string;
  localDate?: string;
}) {
  const timezone = input.timezone || "UTC";
  const localDate = input.localDate || getLocalDateForTimezone(timezone);
  const athlete = ObjectId.isValid(input.athleteId) ? await getChildById(new ObjectId(input.athleteId)) : null;
  const [dailyIq, mentalEdge, painGuardrail, habitRecord, dailyPlan] = await Promise.all([
    getLatestDailyIqSnapshot({ athleteId: input.athleteId, localDate }),
    getMentalEdgeToday({ athleteId: input.athleteId, timezone, localDate }),
    getPainGuardrailToday({ athleteId: input.athleteId, timezone, localDate }),
    getHabitRecordByAthleteIdAndDate(input.athleteId, localDate),
    getDailyPlanByDate(input.athleteId, localDate)
  ]);

  return buildAthleteTwinProjection({
    athleteId: input.athleteId,
    athlete,
    view: input.view,
    viewerRole: input.viewerRole,
    dailyIq,
    mentalEdge,
    painGuardrail,
    habitRecord,
    dailyPlan
  });
}

export async function rebuildAthleteTwinProjection(input: {
  athleteId: string;
  view: AthleteTwinProjectionView;
  viewerRole: AppRole;
  timezone?: string;
  localDate?: string;
}) {
  const projection = await buildAthleteTwinProjectionForView(input);
  return upsertTwinProjectionSnapshot(projection);
}
