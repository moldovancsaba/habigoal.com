import { CanonicalMetric } from "../../types/canonical-metric";

export function normaliseWhoopToMetrics(payload: Record<string, unknown>, athleteId: string, rawPayloadId: string): CanonicalMetric[] {
  const metrics: CanonicalMetric[] = [];
  const date = (payload.created_at as string).split('T')[0];
  const score = payload.score as Record<string, number> | undefined;

  if (score?.recovery_score) {
    metrics.push({
      metricId: `${athleteId}:${date}:whoop:recovery_score`,
      athleteId,
      date,
      source: "whoop",
      sourceMetric: "score.recovery_score",
      canonicalKey: "sleep_quality_score", // Map Whoop recovery to canonical sleep/recovery quality score placeholder
      value: score.recovery_score,
      unit: "score_0_100",
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

  if (score?.strain) {
    metrics.push({
      metricId: `${athleteId}:${date}:whoop:strain_score`,
      athleteId,
      date,
      source: "whoop",
      sourceMetric: "score.strain",
      canonicalKey: "internal_load_points", // map strain roughly to internal load
      value: score.strain * 100, // 0-21 scale mapped to a broader score
      unit: "score_0_100",
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

  return metrics;
}
