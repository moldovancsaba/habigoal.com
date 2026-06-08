import { CanonicalMetric } from "../../types/canonical-metric";

export function normaliseAppleHealthToMetrics(payload: Record<string, unknown>, athleteId: string, rawPayloadId: string): CanonicalMetric[] {
  const metrics: CanonicalMetric[] = [];
  const date = (payload.date as string) ?? new Date().toISOString().split("T")[0];
  const now = new Date().toISOString();

  if (typeof payload.restingHeartRate === "number") {
    metrics.push({
      metricId: `${athleteId}:${date}:apple_health:rhr`,
      athleteId, date, source: "apple_health", sourceMetric: "restingHeartRate",
      canonicalKey: "resting_heart_rate_bpm", value: payload.restingHeartRate, unit: "bpm",
      confidence: "medium", periodStart: date, periodEnd: date, rawPayloadId,
      normalisedAt: now, normalisationVersion: "1.0.0", processingState: "normalised",
      organisationId: "", createdAt: now, updatedAt: now,
    });
  }

  if (typeof payload.stepCount === "number") {
    metrics.push({
      metricId: `${athleteId}:${date}:apple_health:steps`,
      athleteId, date, source: "apple_health", sourceMetric: "stepCount",
      canonicalKey: "external_load_points", value: payload.stepCount, unit: "count",
      confidence: "low", periodStart: date, periodEnd: date, rawPayloadId,
      normalisedAt: now, normalisationVersion: "1.0.0", processingState: "normalised",
      organisationId: "", createdAt: now, updatedAt: now,
    });
  }

  return metrics;
}
