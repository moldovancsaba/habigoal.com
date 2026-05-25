import type { TrainingLoadRecord, TrainingLoadSource, TrainingLoadSummary, TrainingLoadZone } from "@/types/training-load";

export const TRAINING_LOAD_VERSION = "2026-05-25";

export const trainingLoadZoneThresholds = {
  underMax: 799,
  optimalMax: 2200,
  heavyMax: 3200
} as const;

const allowedSources: TrainingLoadSource[] = ["athlete", "trainer", "session_debrief", "check_in"];

export function computeLoadPoints(durationMinutes: number, rpe: number | null) {
  return Math.round(durationMinutes * (rpe ?? 0));
}

export function classifyWeeklyTrainingLoad(totalPoints: number | null, records: number): TrainingLoadZone {
  if (totalPoints === null || records === 0) return "unknown";
  if (totalPoints <= trainingLoadZoneThresholds.underMax) return "under";
  if (totalPoints <= trainingLoadZoneThresholds.optimalMax) return "optimal";
  if (totalPoints <= trainingLoadZoneThresholds.heavyMax) return "heavy";
  return "risk";
}

export function getMondayDate(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return "";
  const day = date.getUTCDay();
  const distance = day === 0 ? -6 : 1 - day;
  date.setUTCDate(date.getUTCDate() + distance);
  return date.toISOString().slice(0, 10);
}

export function getWeekEndDate(weekStart: string) {
  const date = new Date(`${weekStart}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return "";
  date.setUTCDate(date.getUTCDate() + 6);
  return date.toISOString().slice(0, 10);
}

export function buildTrainingLoadSummary(records: TrainingLoadRecord[], weekStart: string): TrainingLoadSummary {
  const weeklyRecords = records.filter((record) => {
    const weekEnd = getWeekEndDate(weekStart);
    return record.date >= weekStart && record.date <= weekEnd;
  });
  const totalPoints = weeklyRecords.reduce((sum, record) => sum + record.loadPoints, 0);

  return {
    weekStart,
    totalPoints,
    zone: classifyWeeklyTrainingLoad(totalPoints, weeklyRecords.length),
    records: weeklyRecords.length
  };
}

export function parseTrainingLoadInput(input: Record<string, unknown> | null | undefined) {
  const date = stringValue(input?.date, 10);
  const durationMinutes = numberValue(input?.durationMinutes, 1, 360);
  const rpe = nullableNumberValue(input?.rpe, 1, 10);
  const source = sourceValue(input?.source);
  const activityTypes = Array.isArray(input?.activityTypes)
    ? Array.from(new Set(input.activityTypes.map((value) => stringValue(value, 80)).filter(Boolean))).slice(0, 8)
    : [];
  const note = stringValue(input?.note, 500);

  return {
    date,
    source,
    activityTypes,
    durationMinutes,
    rpe,
    loadPoints: durationMinutes === null ? null : computeLoadPoints(durationMinutes, rpe),
    note
  };
}

export function validateTrainingLoadInput(input: ReturnType<typeof parseTrainingLoadInput>) {
  if (!input.date || !/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
    return "A valid date is required.";
  }
  if (input.durationMinutes === null) {
    return "Duration must be between 1 and 360 minutes.";
  }
  if (input.loadPoints === null) {
    return "Training load could not be computed.";
  }
  return "";
}

function sourceValue(value: unknown): TrainingLoadSource {
  return typeof value === "string" && allowedSources.includes(value as TrainingLoadSource)
    ? value as TrainingLoadSource
    : "athlete";
}

function stringValue(value: unknown, max: number) {
  return typeof value === "string" ? value.slice(0, max).trim() : "";
}

function numberValue(value: unknown, min: number, max: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const rounded = Math.round(value);
  if (rounded < min || rounded > max) return null;
  return rounded;
}

function nullableNumberValue(value: unknown, min: number, max: number) {
  if (value === null || value === undefined || value === "") return null;
  return numberValue(value, min, max);
}
