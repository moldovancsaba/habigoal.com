import type { AthleteIqCheckInFieldDefinition, AthleteIqCheckInFieldKey, AthleteIqCheckInInput, AthleteIqCheckInMode, AthleteIqCheckInSnapshot, AthleteIqCheckInSourceLabel, AthleteIqCheckInValue } from "@/types/athleteiq-check-in";

export const ATHLETEIQ_CHECK_IN_CAPABILITY_KEY = "AIQ-1210";
export const ATHLETEIQ_CHECK_IN_CONTRACT_VERSION = "aiq-checkin-1210.1";

const lifestyleRequiredFields: AthleteIqCheckInFieldKey[] = ["sleepQuality", "fatigue", "pain", "stress", "mood"];

export const athleteIqCheckInFields: AthleteIqCheckInFieldDefinition[] = [
  { key: "sleepQuality", labelKey: "athleteiq.checkin.sleepQuality", sectionKey: "lifestyle", kind: "integer_1_10", requiredInModes: ["lifestyle", "performance"], min: 1, max: 10 },
  { key: "fatigue", labelKey: "athleteiq.checkin.fatigue", sectionKey: "lifestyle", kind: "integer_1_10", requiredInModes: ["lifestyle", "performance"], min: 1, max: 10 },
  { key: "pain", labelKey: "athleteiq.checkin.pain", sectionKey: "lifestyle", kind: "integer_1_10", requiredInModes: ["lifestyle", "performance"], min: 1, max: 10 },
  { key: "stress", labelKey: "athleteiq.checkin.stress", sectionKey: "lifestyle", kind: "integer_1_10", requiredInModes: ["lifestyle", "performance"], min: 1, max: 10 },
  { key: "mood", labelKey: "athleteiq.checkin.mood", sectionKey: "lifestyle", kind: "integer_1_10", requiredInModes: ["lifestyle", "performance"], min: 1, max: 10 },
  { key: "motivation", labelKey: "athleteiq.checkin.motivation", sectionKey: "performance", kind: "integer_1_10", requiredInModes: [], min: 1, max: 10 },
  { key: "confidence", labelKey: "athleteiq.checkin.confidence", sectionKey: "performance", kind: "integer_1_10", requiredInModes: [], min: 1, max: 10 },
  { key: "focus", labelKey: "athleteiq.checkin.focus", sectionKey: "performance", kind: "integer_1_10", requiredInModes: [], min: 1, max: 10 },
  { key: "trainingLoad", labelKey: "athleteiq.checkin.trainingLoad", sectionKey: "performance", kind: "number", requiredInModes: [], min: 0, max: 1000 },
  { key: "sorenessAreas", labelKey: "athleteiq.checkin.sorenessAreas", sectionKey: "performance", kind: "string_list", requiredInModes: [] },
  { key: "sleepHours", labelKey: "athleteiq.checkin.sleepHours", sectionKey: "manual_device", kind: "number", requiredInModes: [], min: 0, max: 24 },
  { key: "manualHrv", labelKey: "athleteiq.checkin.manualHrv", sectionKey: "manual_device", kind: "number", requiredInModes: [], min: 1, max: 300 },
  { key: "manualRestingHr", labelKey: "athleteiq.checkin.manualRestingHr", sectionKey: "manual_device", kind: "number", requiredInModes: [], min: 20, max: 220 },
  { key: "deviceSourceStatus", labelKey: "athleteiq.checkin.deviceSourceStatus", sectionKey: "manual_device", kind: "source_status", requiredInModes: [] },
  { key: "note", labelKey: "athleteiq.checkin.note", sectionKey: "notes", kind: "note", requiredInModes: [] }
];

export function isAthleteIqCheckInMode(value: unknown): value is AthleteIqCheckInMode {
  return value === "lifestyle" || value === "performance";
}

export function normalizeTenPointValue(value: number) {
  return Math.round(((value - 1) / 9) * 100);
}

export function getAthleteIqCheckInSchema(mode: AthleteIqCheckInMode) {
  const fields = athleteIqCheckInFields.filter((field) =>
    mode === "performance" || lifestyleRequiredFields.includes(field.key) || field.key === "note"
  );

  return {
    contractVersion: ATHLETEIQ_CHECK_IN_CONTRACT_VERSION,
    capabilityKey: ATHLETEIQ_CHECK_IN_CAPABILITY_KEY,
    mode,
    requiredFields: athleteIqCheckInFields.filter((field) => field.requiredInModes.includes(mode)).map((field) => field.key),
    fields
  };
}

export function getLocalDateForTimezone(timezone: string, date = new Date()) {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

export function buildAthleteIqCheckInSnapshot(input: AthleteIqCheckInInput, now = new Date()): { snapshot?: AthleteIqCheckInSnapshot; errors: string[]; highPain: boolean } {
  const athleteId = stringValue(input.athleteId, 120);
  const mode = isAthleteIqCheckInMode(input.mode) ? input.mode : "lifestyle";
  const timezone = stringValue(input.timezone, 80) || "UTC";
  const localDate = getLocalDateForTimezone(timezone, now);
  const errors: string[] = [];
  const values: AthleteIqCheckInSnapshot["values"] = {};
  const sourceLabels: AthleteIqCheckInSnapshot["sourceLabels"] = {};
  const rawValues = input.values && typeof input.values === "object" ? input.values : {};

  if (!athleteId) errors.push("athleteId is required");

  const schema = getAthleteIqCheckInSchema(mode);
  for (const field of schema.fields) {
    const parsed = parseFieldValue(field, rawValues[field.key]);
    if (parsed.error) errors.push(`${field.key}: ${parsed.error}`);
    if (parsed.value) {
      values[field.key] = parsed.value;
      sourceLabels[field.key] = parsed.value.sourceLabel;
    }
  }

  const missingFields = schema.requiredFields.filter((key) => !values[key]);
  for (const missingField of missingFields) {
    sourceLabels[missingField] = "missing";
  }
  if (missingFields.length > 0) errors.push(`missing required fields: ${missingFields.join(", ")}`);

  if (errors.length > 0) return { errors, highPain: false };

  const nowIso = now.toISOString();
  return {
    errors: [],
    highPain: typeof values.pain?.rawValue === "number" && values.pain.rawValue >= 8,
    snapshot: {
      athleteId,
      mode,
      localDate,
      timezone,
      values,
      missingFields,
      sourceLabels,
      submittedAt: nowIso,
      updatedAt: nowIso,
      idempotencyKey: stringValue(input.idempotencyKey, 160) || undefined,
      auditHistory: [`submitted:${nowIso}`]
    }
  };
}

function parseFieldValue(field: AthleteIqCheckInFieldDefinition, value: unknown): { value?: AthleteIqCheckInValue; error?: string } {
  if (value === undefined || value === null || value === "") return {};

  if (field.kind === "integer_1_10") {
    const numberValue = Number(value);
    if (!Number.isInteger(numberValue) || numberValue < 1 || numberValue > 10) return { error: "must be an integer from 1 to 10" };
    return { value: { rawValue: numberValue, normalizedValue: normalizeTenPointValue(numberValue), sourceLabel: "user_input" } };
  }

  if (field.kind === "number") {
    const numberValue = Number(value);
    if (!Number.isFinite(numberValue)) return { error: "must be a finite number" };
    if (typeof field.min === "number" && numberValue < field.min) return { error: `must be >= ${field.min}` };
    if (typeof field.max === "number" && numberValue > field.max) return { error: `must be <= ${field.max}` };
    return { value: { rawValue: numberValue, normalizedValue: null, sourceLabel: "manual_entry" } };
  }

  if (field.kind === "string_list") {
    if (!Array.isArray(value)) return { error: "must be a list" };
    const list = value.map((item) => stringValue(item, 80)).filter(Boolean).slice(0, 20);
    if (list.length === 0) return {};
    return { value: { rawValue: list, normalizedValue: null, sourceLabel: "manual_entry" } };
  }

  if (field.kind === "source_status") {
    const sourceStatus = stringValue(value, 40);
    if (!["manual", "connected", "unavailable"].includes(sourceStatus)) return { error: "must be manual, connected, or unavailable" };
    const sourceLabel: AthleteIqCheckInSourceLabel = sourceStatus === "unavailable" ? "device_unavailable" : "manual_entry";
    return { value: { rawValue: sourceStatus, normalizedValue: null, sourceLabel } };
  }

  const note = stringValue(value, 1000);
  if (!note) return {};
  return { value: { rawValue: note, normalizedValue: null, sourceLabel: "user_input" } };
}

function stringValue(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}
