export type AthleteIqCheckInMode = "lifestyle" | "performance";

export type AthleteIqCheckInFieldKey =
  | "sleepQuality"
  | "fatigue"
  | "pain"
  | "stress"
  | "mood"
  | "motivation"
  | "confidence"
  | "focus"
  | "trainingLoad"
  | "sorenessAreas"
  | "sleepHours"
  | "manualHrv"
  | "manualRestingHr"
  | "deviceSourceStatus"
  | "note";

export type AthleteIqCheckInFieldKind = "integer_1_10" | "number" | "string_list" | "source_status" | "note";
export type AthleteIqCheckInSourceLabel = "user_input" | "manual_entry" | "missing" | "device_unavailable";

export type AthleteIqCheckInFieldDefinition = {
  key: AthleteIqCheckInFieldKey;
  labelKey: string;
  sectionKey: "lifestyle" | "performance" | "manual_device" | "notes";
  kind: AthleteIqCheckInFieldKind;
  requiredInModes: AthleteIqCheckInMode[];
  min?: number;
  max?: number;
};

export type AthleteIqCheckInValue = {
  rawValue: number | string | string[] | null;
  normalizedValue: number | null;
  sourceLabel: AthleteIqCheckInSourceLabel;
};

export type AthleteIqCheckInSnapshot = {
  id?: string;
  athleteId: string;
  mode: AthleteIqCheckInMode;
  localDate: string;
  timezone: string;
  values: Partial<Record<AthleteIqCheckInFieldKey, AthleteIqCheckInValue>>;
  missingFields: AthleteIqCheckInFieldKey[];
  sourceLabels: Partial<Record<AthleteIqCheckInFieldKey, AthleteIqCheckInSourceLabel>>;
  submittedAt: string;
  updatedAt: string;
  idempotencyKey?: string;
  auditHistory: string[];
};

export type AthleteIqCheckInInput = {
  athleteId: string;
  mode?: AthleteIqCheckInMode;
  timezone?: string;
  values?: Record<string, unknown>;
  idempotencyKey?: string;
};
