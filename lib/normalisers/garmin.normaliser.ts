import { CanonicalMetric } from "../../types/canonical-metric";

export function normaliseGarminToMetrics(payload: Record<string, unknown>, athleteId: string, rawPayloadId: string): CanonicalMetric[] {
  const metrics: CanonicalMetric[] = [];
  const date = payload.summaryDate as string; // e.g. 2026-06-08

  if (payload.restingHeartRateInBeatsPerMinute) {
    metrics.push({
      metricId: `${athleteId}:${date}:garmin:resting_heart_rate_bpm`,
      athleteId,
      date,
      source: "garmin",
      sourceMetric: "restingHeartRateInBeatsPerMinute",
      canonicalKey: "resting_heart_rate_bpm",
      value: payload.restingHeartRateInBeatsPerMinute as number,
      unit: "bpm",
      confidence: "high",
      periodStart: `${date}T00:00:00Z`,
      periodEnd: `${date}T23:59:59Z`,
      rawPayloadId,
      normalisedAt: new Date().toISOString(),
      normalisationVersion: "1.0.0",
      processingState: "normalised",
      organisationId: "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  if (payload.averageStressLevel) {
    metrics.push({
      metricId: `${athleteId}:${date}:garmin:stress_score`,
      athleteId,
      date,
      source: "garmin",
      sourceMetric: "averageStressLevel",
      canonicalKey: "stress_score",
      value: payload.averageStressLevel as number,
      unit: "score_0_100",
      confidence: "medium",
      periodStart: `${date}T00:00:00Z`,
      periodEnd: `${date}T23:59:59Z`,
      rawPayloadId,
      normalisedAt: new Date().toISOString(),
      normalisationVersion: "1.0.0",
      processingState: "normalised",
      organisationId: "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  return metrics;
}
