import { buildAthleteIqCheckInSnapshot } from "@/lib/athleteiq-check-in";
import { upsertAthleteIqCheckInSnapshot } from "@/repositories/athleteiq-check-in.repository";
import { runAthleteIqDailyEngine } from "@/services/athleteiq-daily-engine.service";
import type { AssessmentRecord, ScoreEntry } from "@/types/assessment";
import type { AthleteIqCheckInInput, AthleteIqCheckInSnapshot } from "@/types/athleteiq-check-in";
import type { DailyEngineActor, DailyEngineRun } from "@/types/athleteiq-daily-engine";

const DEFAULT_TIMEZONE = "Europe/Budapest";

export type AssessmentDailyStateSyncResult = {
  athleteId?: string;
  engineRun?: DailyEngineRun;
  localDate?: string;
  performanceSnapshot?: AthleteIqCheckInSnapshot;
  skippedReason?: string;
  lifestyleSnapshot?: AthleteIqCheckInSnapshot;
};

export type AssessmentDailyStateSyncOptions = {
  actor?: DailyEngineActor;
  runEngine?: boolean;
  timezone?: string;
};

export async function syncAssessmentToAthleteIqDailyState(
  assessment: AssessmentRecord,
  options: AssessmentDailyStateSyncOptions = {}
): Promise<AssessmentDailyStateSyncResult> {
  const athleteId = stringId(assessment.childId);
  if (!athleteId) return { skippedReason: "missing_athlete_id" };

  const localDate = normalizeLocalDate(assessment.session?.date);
  if (!localDate) return { athleteId, skippedReason: "missing_session_date" };

  const values = mapAssessmentToAthleteIqValues(assessment);
  if (!values) return { athleteId, localDate, skippedReason: "missing_required_scores" };

  const timezone = options.timezone || DEFAULT_TIMEZONE;
  const snapshotDate = dateAtNoonUtc(localDate);
  const lifestyleResult = buildAssessmentSnapshot({
    assessment,
    athleteId,
    localDate,
    mode: "lifestyle",
    timezone,
    values
  }, snapshotDate);

  if (!lifestyleResult.snapshot) {
    return { athleteId, localDate, skippedReason: `lifestyle_validation:${lifestyleResult.errors.join(",")}` };
  }

  const performanceResult = buildAssessmentSnapshot({
    assessment,
    athleteId,
    localDate,
    mode: "performance",
    timezone,
    values
  }, snapshotDate);

  if (!performanceResult.snapshot) {
    return { athleteId, localDate, skippedReason: `performance_validation:${performanceResult.errors.join(",")}` };
  }

  const [lifestyleSnapshot, performanceSnapshot] = await Promise.all([
    upsertAthleteIqCheckInSnapshot(lifestyleResult.snapshot),
    upsertAthleteIqCheckInSnapshot(performanceResult.snapshot)
  ]);

  let engineRun: DailyEngineRun | undefined;
  if (options.runEngine !== false) {
    const actor = options.actor ?? {
      email: "system@habigoal.local",
      name: "Habigoal System",
      role: "admin" as const
    };
    engineRun = await runAthleteIqDailyEngine({
      athleteId,
      localDate,
      timezone,
      mode: "performance",
      sourceEvent: "check_in_submitted",
      idempotencyKey: performanceSnapshot.idempotencyKey || `${athleteId}:${localDate}:assessment-performance`,
      actor
    });
  }

  return {
    athleteId,
    engineRun,
    localDate,
    performanceSnapshot,
    lifestyleSnapshot
  };
}

export function mapAssessmentToAthleteIqValues(assessment: Pick<AssessmentRecord, "scores" | "trainingLoad" | "notes">) {
  const sleepQuality = fivePointScoreToTenPoint(assessment.scores.sleep_quality);
  const fatigue = invertTenPoint(fivePointScoreToTenPoint(assessment.scores.energy_level));
  const pain = invertTenPoint(fivePointScoreToTenPoint(assessment.scores.body_feel));
  const stress = invertTenPoint(fivePointScoreToTenPoint(assessment.scores.stress_load));
  const mood = fivePointScoreToTenPoint(assessment.scores.mood_state);

  if ([sleepQuality, fatigue, pain, stress, mood].some((value) => value === null)) {
    return null;
  }

  const values: AthleteIqCheckInInput["values"] = {
    sleepQuality,
    fatigue,
    pain,
    stress,
    mood
  };

  const confidence = fivePointScoreToTenPoint(assessment.scores.confidence_level);
  if (confidence !== null) values.confidence = confidence;

  const focus = fivePointScoreToTenPoint(assessment.scores.focus_level);
  if (focus !== null) values.focus = focus;

  const sleepHours = sleepHoursFromScore(assessment.scores.sleep_hours);
  if (sleepHours !== null) values.sleepHours = sleepHours;

  const trainingLoad = trainingLoadPoints(assessment.trainingLoad);
  if (trainingLoad !== null) values.trainingLoad = trainingLoad;

  const note = assessment.notes.general.trim();
  if (note) values.note = note;

  return values;
}

function buildAssessmentSnapshot(
  input: {
    assessment: AssessmentRecord;
    athleteId: string;
    localDate: string;
    mode: "lifestyle" | "performance";
    timezone: string;
    values: AthleteIqCheckInInput["values"];
  },
  snapshotDate: Date
) {
  const result = buildAthleteIqCheckInSnapshot({
    athleteId: input.athleteId,
    idempotencyKey: `assessment:${input.assessment._id || input.athleteId}:${input.localDate}:${input.mode}`,
    mode: input.mode,
    timezone: input.timezone,
    values: input.values
  }, snapshotDate);

  if (result.snapshot) {
    result.snapshot.localDate = input.localDate;
    result.snapshot.auditHistory = [
      ...result.snapshot.auditHistory,
      `assessment-sync:${input.assessment._id || "unknown"}:${new Date().toISOString()}`
    ];
  }

  return result;
}

function fivePointScoreToTenPoint(entry: ScoreEntry | undefined) {
  if (!entry || typeof entry.score !== "number") return null;
  if (entry.score < 1 || entry.score > 5) return null;
  return Math.max(1, Math.min(10, Math.round(((entry.score - 1) / 4) * 9 + 1)));
}

function invertTenPoint(value: number | null) {
  return value === null ? null : 11 - value;
}

function sleepHoursFromScore(entry: ScoreEntry | undefined) {
  if (!entry || typeof entry.score !== "number") return null;
  const values: Record<number, number> = {
    1: 7,
    2: 8,
    3: 9,
    4: 10,
    5: 10.5
  };
  return values[entry.score] ?? null;
}

function trainingLoadPoints(trainingLoad: AssessmentRecord["trainingLoad"]) {
  if (typeof trainingLoad.externalLoad === "number" && Number.isFinite(trainingLoad.externalLoad)) {
    return clampLoad(trainingLoad.externalLoad);
  }

  if (
    typeof trainingLoad.durationMinutes === "number" &&
    Number.isFinite(trainingLoad.durationMinutes) &&
    typeof trainingLoad.rpe === "number" &&
    Number.isFinite(trainingLoad.rpe)
  ) {
    return clampLoad(trainingLoad.durationMinutes * trainingLoad.rpe);
  }

  return null;
}

function clampLoad(value: number) {
  return Math.max(0, Math.min(1000, Math.round(value)));
}

function stringId(value: unknown) {
  if (typeof value === "string") return value.trim();
  if (value && typeof value === "object" && "toString" in value) {
    const stringValue = value.toString();
    return stringValue === "[object Object]" ? "" : stringValue;
  }
  return "";
}

function normalizeLocalDate(value: unknown) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : "";
}

function dateAtNoonUtc(localDate: string) {
  return new Date(`${localDate}T12:00:00.000Z`);
}
