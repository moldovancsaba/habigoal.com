import { trackerQuestions } from "@/lib/readiness-model";
import type { CheckInOrgConfig, CheckInQuestionConfig } from "@/types/check-in-config";
import type { HabigoalSettings } from "@/services/settings-service";

const SCORE_KEY_MAP: Record<string, string> = {
  sleep_hours: "sleep_hours",
  sleep_quality: "sleep_quality",
  energy_level: "energy",
  body_feel: "soreness",
  fuel_hydration: "fuel_hydration",
  mood_state: "mood",
  stress_load: "stress",
  confidence_level: "confidence",
  focus_level: "focus",
};

const CANONICAL_KEY_MAP: Record<string, string> = {
  sleep_quality: "sleep_quality_score",
  sleep_hours: "sleep_duration_minutes",
  energy_level: "energy_score",
  body_feel: "soreness_score",
  mood_state: "mood_score",
  stress_load: "stress_score",
};

export function defaultCheckInQuestions(): CheckInQuestionConfig[] {
  return trackerQuestions.map((q) => ({
    key: q.key,
    enabled: true,
    required: true,
    labelKey: q.title,
    canonicalKey: CANONICAL_KEY_MAP[q.key],
    concernThreshold: 3,
  }));
}

export function resolveCheckInConfig(settings: HabigoalSettings | null, organisationId = "default"): CheckInOrgConfig {
  const configured = settings?.checkInConfig?.questions;
  return {
    organisationId,
    questions: configured?.length ? configured : defaultCheckInQuestions(),
    allowDuplicateOverride: settings?.checkInConfig?.allowDuplicateOverride ?? false,
    updatedAt: settings?.checkInConfig?.updatedAt ?? new Date().toISOString(),
  };
}

export function mapQuestionKeyToScoreKey(questionKey: string): string {
  return SCORE_KEY_MAP[questionKey] ?? questionKey;
}

export function enabledQuestions(config: CheckInOrgConfig): CheckInQuestionConfig[] {
  return config.questions.filter((q) => q.enabled);
}
