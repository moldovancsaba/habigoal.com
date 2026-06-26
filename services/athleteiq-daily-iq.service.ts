import { ATHLETEIQ_MODULE_REGISTRY_VERSION } from "@/lib/athleteiq-modules";
import { buildDailyIqSnapshot } from "@/lib/athleteiq-daily-iq";
import { getLocalDateForTimezone, isAthleteIqCheckInMode } from "@/lib/athleteiq-check-in";
import { insertDailyIqSnapshot } from "@/repositories/athleteiq-daily-iq.repository";
import { getAthleteIqCheckInSnapshot } from "@/repositories/athleteiq-check-in.repository";
import { getHabitRecordByAthleteIdAndDate } from "@/repositories/habit-records.repository";
import { listTrainingLoadRecordsByAthleteId } from "@/repositories/training-load.repository";
import type { DailyIqRecalculateRequest, DailyIqSourceBundle } from "@/types/athleteiq-daily-iq";

export async function loadDailyIqSources(input: DailyIqRecalculateRequest): Promise<{ bundle?: DailyIqSourceBundle; errors: string[] }> {
  const athleteId = typeof input.athleteId === "string" ? input.athleteId.trim() : "";
  const timezone = typeof input.timezone === "string" && input.timezone.trim() ? input.timezone.trim() : "UTC";
  const localDate = typeof input.localDate === "string" && input.localDate.trim() ? input.localDate.trim() : getLocalDateForTimezone(timezone);
  const mode = isAthleteIqCheckInMode(input.mode) ? input.mode : "performance";
  const errors: string[] = [];

  if (!athleteId) errors.push("athleteId is required");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(localDate)) errors.push("localDate must use YYYY-MM-DD");
  if (errors.length) return { errors };

  const [checkInSnapshot, habitRecord, trainingLoadRecords] = await Promise.all([
    getAthleteIqCheckInSnapshot(athleteId, localDate, mode),
    getHabitRecordByAthleteIdAndDate(athleteId, localDate),
    listTrainingLoadRecordsByAthleteId({ athleteId, from: localDate, to: localDate })
  ]);

  return {
    errors: [],
    bundle: {
      athleteId,
      localDate,
      timezone,
      mode,
      checkInSnapshot,
      habitRecord,
      trainingLoadRecords
    }
  };
}

export async function recalculateDailyIq(input: DailyIqRecalculateRequest) {
  const sourceResult = await loadDailyIqSources(input);
  if (!sourceResult.bundle) return sourceResult;

  const snapshot = buildDailyIqSnapshot({
    ...sourceResult.bundle,
    moduleRegistryVersion: ATHLETEIQ_MODULE_REGISTRY_VERSION
  });
  const saved = await insertDailyIqSnapshot(snapshot);
  return { errors: [], snapshot: saved };
}
