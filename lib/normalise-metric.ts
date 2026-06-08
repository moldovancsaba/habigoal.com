import {
  CanonicalMetric,
  CanonicalMetricKey,
  MetricSource,
  MetricUnit,
} from "../types/canonical-metric";
import { AssessmentRecord } from "../types/assessment";
import { TrainingLoadRecord } from "../types/training-load";

export const NORMALISATION_VERSION = "1.0.0";

export function buildMetricId(
  athleteId: string,
  date: string,
  source: MetricSource,
  key: CanonicalMetricKey
): string {
  return `${athleteId}:${date}:${source}:${key}`;
}

export function normaliseCheckinToMetrics(
  athleteId: string,
  organisationId: string,
  checkin: AssessmentRecord,
  rawPayloadId?: string
): CanonicalMetric[] {
  const date = checkin.session.date;
  const metrics: CanonicalMetric[] = [];
  const now = new Date().toISOString();

  // Helper to add a score metric based on a 1-10 mapping.
  // Assuming AssessmentRecord scores values are 1-10 or mapped linearly to 1-10.
  const addScoreMetric = (
    sourceKey: string,
    canonicalKey: CanonicalMetricKey,
    unit: MetricUnit = "score_1_10"
  ) => {
    const entry = checkin.scores[sourceKey];
    if (entry && typeof entry.score === "number") {
      metrics.push({
        metricId: buildMetricId(athleteId, date, "check_in", canonicalKey),
        athleteId,
        organisationId,
        source: "check_in",
        sourceMetric: `scores.${sourceKey}`,
        canonicalKey,
        value: entry.score,
        unit,
        confidence: entry.confidence || "high",
        periodStart: date,
        periodEnd: date,
        date,
        rawPayloadId,
        normalisedAt: now,
        normalisationVersion: NORMALISATION_VERSION,
        processingState: "normalised",
        createdAt: now,
        updatedAt: now,
      });
    }
  };

  addScoreMetric("mood", "mood_score");
  addScoreMetric("energy", "energy_score");
  addScoreMetric("stress", "stress_score");
  addScoreMetric("soreness", "soreness_score");
  addScoreMetric("sleep", "sleep_quality_score", "score_1_10");

  return metrics;
}

export function normaliseTrainingLoadToMetrics(
  record: TrainingLoadRecord,
  organisationId: string,
  rawPayloadId?: string
): CanonicalMetric[] {
  const date = record.date;
  const metrics: CanonicalMetric[] = [];
  const now = new Date().toISOString();

  // Internal load points
  if (record.loadPoints != null) {
    metrics.push({
      metricId: buildMetricId(
        record.athleteId,
        date,
        "check_in", // Training load source might be check_in or manual_coach, but for now map it to check_in if from app
        "internal_load_points"
      ),
      athleteId: record.athleteId,
      organisationId,
      source: record.source === "trainer" ? "manual_coach" : "check_in",
      sourceMetric: "loadPoints",
      canonicalKey: "internal_load_points",
      value: record.loadPoints,
      unit: "count", // or score_0_100, assuming count for load points
      confidence: "high",
      periodStart: date,
      periodEnd: date,
      date,
      rawPayloadId,
      normalisedAt: now,
      normalisationVersion: NORMALISATION_VERSION,
      processingState: "normalised",
      createdAt: now,
      updatedAt: now,
    });
  }

  // RPE
  if (record.rpe != null) {
    metrics.push({
      metricId: buildMetricId(
        record.athleteId,
        date,
        record.source === "trainer" ? "manual_coach" : "check_in",
        "session_rpe"
      ),
      athleteId: record.athleteId,
      organisationId,
      source: record.source === "trainer" ? "manual_coach" : "check_in",
      sourceMetric: "rpe",
      canonicalKey: "session_rpe",
      value: record.rpe,
      unit: "rpe_1_10",
      confidence: "high",
      periodStart: date,
      periodEnd: date,
      date,
      rawPayloadId,
      normalisedAt: now,
      normalisationVersion: NORMALISATION_VERSION,
      processingState: "normalised",
      createdAt: now,
      updatedAt: now,
    });
  }

  // Duration
  if (record.durationMinutes != null) {
    metrics.push({
      metricId: buildMetricId(
        record.athleteId,
        date,
        record.source === "trainer" ? "manual_coach" : "check_in",
        "session_duration_minutes"
      ),
      athleteId: record.athleteId,
      organisationId,
      source: record.source === "trainer" ? "manual_coach" : "check_in",
      sourceMetric: "durationMinutes",
      canonicalKey: "session_duration_minutes",
      value: record.durationMinutes,
      unit: "minutes",
      confidence: "high",
      periodStart: date,
      periodEnd: date,
      date,
      rawPayloadId,
      normalisedAt: now,
      normalisationVersion: NORMALISATION_VERSION,
      processingState: "normalised",
      createdAt: now,
      updatedAt: now,
    });
  }

  return metrics;
}
