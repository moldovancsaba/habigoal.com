import { CanonicalMetric } from "../../types/canonical-metric";

export function normaliseOuraToMetrics(payload: Record<string, unknown>, athleteId: string, rawPayloadId: string): CanonicalMetric[] {
  const metrics: CanonicalMetric[] = [];
  const date = (payload.day as string) ?? new Date().toISOString().split("T")[0];
  const now = new Date().toISOString();

  const readiness = payload.readiness as Record<string, number> | undefined;
  if (readiness?.score != null) {
    metrics.push({
      metricId: `${athleteId}:${date}:oura:readiness_score`,
      athleteId, date, source: "oura", sourceMetric: "readiness.score",
      canonicalKey: "sleep_quality_score", value: readiness.score, unit: "score_0_100",
      confidence: "high", periodStart: date, periodEnd: date, rawPayloadId,
      normalisedAt: now, normalisationVersion: "1.0.0", processingState: "normalised",
      organisationId: "", createdAt: now, updatedAt: now,
    });
  }

  const sleep = payload.sleep as Record<string, number> | undefined;
  if (sleep?.total_sleep_duration != null) {
    metrics.push({
      metricId: `${athleteId}:${date}:oura:sleep_duration`,
      athleteId, date, source: "oura", sourceMetric: "sleep.total_sleep_duration",
      canonicalKey: "sleep_duration_minutes", value: Math.round(sleep.total_sleep_duration / 60), unit: "minutes",
      confidence: "high", periodStart: date, periodEnd: date, rawPayloadId,
      normalisedAt: now, normalisationVersion: "1.0.0", processingState: "normalised",
      organisationId: "", createdAt: now, updatedAt: now,
    });
  }

  return metrics;
}
