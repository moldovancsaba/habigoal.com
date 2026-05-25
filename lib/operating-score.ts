import { getCompatiblePillarScore, getCompatibleReadinessState } from "@/lib/assessment-compat";
import { athleteHabitDefinitions, getHabitCompletion } from "@/lib/athlete-habits";
import type { AssessmentRecord } from "@/types/assessment";
import type { HabitRecord } from "@/types/habit-record";
import type { DailyOperatingMetrics, OperatingScoreComponent, ReadinessZone } from "@/types/operating-score";

export const OPERATING_SCORE_VERSION = "2026-05-25";

export const OPERATING_SCORE_WEIGHTS: Record<OperatingScoreComponent, number> = {
  readiness: 0.25,
  habits: 0.25,
  recovery: 0.2,
  trainingLoad: 0.15,
  performance: 0.15
};

const recoveryHabitKeys = new Set(["stretching", "mobility", "recoverySession", "hydration", "nutrition", "sleepBeforeMidnight"]);
const recoveryScoreKeys = ["sleep_quality", "body_feel", "fuel_hydration", "energy_level"] as const;

export function buildDailyOperatingMetrics({
  athleteId,
  assessments,
  habitRecords
}: {
  athleteId: string;
  assessments: AssessmentRecord[];
  habitRecords: HabitRecord[];
}): DailyOperatingMetrics[] {
  const habitsByDate = new Map(habitRecords.map((record) => [record.date, record]));
  return assessments
    .slice()
    .sort((a, b) => a.session.date.localeCompare(b.session.date))
    .map((assessment) =>
      buildDailyOperatingMetric({
        athleteId,
        assessment,
        habitRecord: habitsByDate.get(assessment.session.date) ?? null
      })
    );
}

export function buildDailyOperatingMetric({
  athleteId,
  assessment,
  habitRecord
}: {
  athleteId: string;
  assessment: AssessmentRecord;
  habitRecord?: HabitRecord | null;
}): DailyOperatingMetrics {
  const readinessScore = getReadinessScore(assessment);
  const habitScore = habitRecord ? getHabitCompletion(habitRecord.statuses).score : null;
  const recoveryScore = getRecoveryScore(assessment, habitRecord ?? null);
  const trainingLoadPoints = getTrainingLoadPoints(assessment);
  const trainingLoadScore = scoreTrainingLoad(trainingLoadPoints);
  const performanceScore = getPerformanceScore(assessment);
  const athleteIqScore = getWeightedScore({
    readiness: readinessScore,
    habits: habitScore,
    recovery: recoveryScore,
    trainingLoad: trainingLoadScore,
    performance: performanceScore
  });

  return {
    athleteId,
    date: assessment.session.date,
    scoreVersion: OPERATING_SCORE_VERSION,
    athleteIqScore,
    readinessScore,
    habitScore,
    recoveryScore,
    trainingLoadPoints,
    trainingLoadScore,
    performanceScore,
    readinessZone: getReadinessZone(athleteIqScore),
    sourceCompleteness: {
      checkIn: true,
      habits: habitRecord !== null && habitRecord !== undefined,
      recovery: recoveryScore !== null,
      trainingLoad: trainingLoadPoints !== null,
      performance: performanceScore !== null
    },
    componentWeights: OPERATING_SCORE_WEIGHTS
  };
}

export function getReadinessScore(record: AssessmentRecord) {
  if (typeof record.computed.ski === "number") {
    return normalizeSixPointScore(record.computed.ski);
  }

  return normalizeFivePointScore(getCompatibleReadinessState(record).gaugeValue);
}

export function normalizeSixPointScore(value: number) {
  return roundScore(((clamp(value, 1, 6) - 1) / 5) * 100);
}

export function normalizeFivePointScore(value: number) {
  return roundScore((clamp(value, 0, 5) / 5) * 100);
}

export function scoreTrainingLoad(trainingLoadPoints: number | null) {
  if (trainingLoadPoints === null) return null;
  if (trainingLoadPoints <= 0) return 40;
  if (trainingLoadPoints < 180) return 55;
  if (trainingLoadPoints <= 520) return 90;
  if (trainingLoadPoints <= 760) return 75;
  return 50;
}

export function getReadinessZone(score: number | null): ReadinessZone {
  if (score === null) return "unknown";
  if (score >= 85) return "peak";
  if (score >= 70) return "good";
  if (score >= 55) return "moderate";
  if (score >= 40) return "fatigued";
  return "recovery";
}

function getTrainingLoadPoints(record: AssessmentRecord) {
  const duration = record.trainingLoad.durationMinutes;
  const rpe = record.trainingLoad.rpe;
  if (typeof duration === "number" && typeof rpe === "number") {
    return Math.round(duration * rpe);
  }

  const externalLoad = record.trainingLoad.externalLoad;
  return typeof externalLoad === "number" ? Math.round(externalLoad) : null;
}

function getRecoveryScore(record: AssessmentRecord, habitRecord: HabitRecord | null) {
  const checkInScores = recoveryScoreKeys
    .map((key) => record.scores[key]?.score)
    .filter((score): score is number => typeof score === "number")
    .map(normalizeSixPointScore);

  const habitScore = habitRecord ? getRecoveryHabitScore(habitRecord) : null;
  const sources = [...checkInScores, ...(habitScore === null ? [] : [habitScore])];
  return sources.length ? roundScore(sources.reduce((sum, value) => sum + value, 0) / sources.length) : null;
}

function getRecoveryHabitScore(habitRecord: HabitRecord) {
  const recoveryHabits = athleteHabitDefinitions.filter((habit) => recoveryHabitKeys.has(habit.key));
  if (!recoveryHabits.length) return null;

  const completed = recoveryHabits.filter((habit) => habitRecord.statuses[habit.key]).length;
  return roundScore((completed / recoveryHabits.length) * 100);
}

function getPerformanceScore(record: AssessmentRecord) {
  const values = [
    getCompatiblePillarScore(record, "physical_pillar"),
    getCompatiblePillarScore(record, "mental_pillar"),
    getCompatiblePillarScore(record, "sport_brain_pillar")
  ].filter((score) => score > 0);

  if (!values.length) return null;
  return normalizeSixPointScore(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function getWeightedScore(values: Record<OperatingScoreComponent, number | null>) {
  let weightedTotal = 0;
  let availableWeight = 0;

  for (const component of Object.keys(OPERATING_SCORE_WEIGHTS) as OperatingScoreComponent[]) {
    const value = values[component];
    if (value === null) continue;
    weightedTotal += value * OPERATING_SCORE_WEIGHTS[component];
    availableWeight += OPERATING_SCORE_WEIGHTS[component];
  }

  return availableWeight > 0 ? roundScore(weightedTotal / availableWeight) : null;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function roundScore(value: number) {
  return Number(value.toFixed(1));
}
