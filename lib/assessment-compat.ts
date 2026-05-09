import { readinessChecklist, trackerQuestions, type AthleteIqPillarKey } from "@/lib/athlete-iq-survey";
import { sectionsForMode } from "@/lib/survey-schema";
import type { AssessmentRecord } from "@/types/assessment";

const legacyReadinessKeys = [
  "readiness_sleep_recovery",
  "readiness_hydration",
  "readiness_fuel_quality",
  "readiness_mental_state",
  "readiness_body_status",
  "readiness_energy_activation",
  "readiness_session_intent"
] as const;

const legacyComputedMap: Record<AthleteIqPillarKey, keyof AssessmentRecord["computed"]> = {
  physical_pillar: "movementAverage",
  mental_pillar: "socialAverage",
  sport_brain_pillar: "mentalAverage"
};

export function hasTrackerScores(record: AssessmentRecord) {
  return trackerQuestions.some((question) => typeof record.scores[question.key]?.score === "number");
}

export function hasLegacyReadinessScores(record: AssessmentRecord) {
  return legacyReadinessKeys.some((key) => typeof record.scores[key]?.score === "number");
}

export function getCompatiblePillarScore(record: AssessmentRecord, key: AthleteIqPillarKey) {
  const section = sectionsForMode(record.mode).find((entry) => entry.key === key);
  if (section) {
    const values = section.items
      .map((item) => record.scores[item.key]?.score)
      .filter((score): score is number => typeof score === "number");
    if (values.length) {
      return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2));
    }
  }

  const computedKey = legacyComputedMap[key];
  const computedValue = record.computed[computedKey];
  return typeof computedValue === "number" ? Number(computedValue.toFixed(2)) : 0;
}

export function getCompatibleReadinessState(record: AssessmentRecord) {
  if (hasTrackerScores(record)) {
    const count = readinessChecklist.filter((item) => {
      const score = record.scores[item.key]?.score;
      return typeof score === "number" && score >= 4;
    }).length;
    return {
      count,
      total: readinessChecklist.length,
      gaugeValue: Number(((count / readinessChecklist.length) * 5).toFixed(1))
    };
  }

  const count = legacyReadinessKeys.filter((key) => {
    const score = record.scores[key]?.score;
    return typeof score === "number" && score >= 6;
  }).length;
  const total = legacyReadinessKeys.length;
  return {
    count,
    total,
    gaugeValue: Number(((count / total) * 5).toFixed(1))
  };
}

export function getCompatibleReadinessScore(record: AssessmentRecord) {
  if (typeof record.computed.ski === "number") {
    return Number(Math.min(5, record.computed.ski).toFixed(2));
  }
  return getCompatibleReadinessState(record).gaugeValue;
}
