import { CanonicalMetric } from "../../types/canonical-metric";

export function normalisePolarToMetrics(payload: Record<string, unknown>, athleteId: string, rawPayloadId: string): CanonicalMetric[] {
  const metrics: CanonicalMetric[] = [];
  const date = (payload.date as string) ?? new Date().toISOString().split("T")[0];
  const now = new Date().toISOString();

  if (typeof payload.trainingLoad === "number") {
    metrics.push({
      metricId: `${athleteId}:${date}:polar:training_load`,
      athleteId, date, source: "polar", sourceMetric: "trainingLoad",
      canonicalKey: "internal_load_points", value: payload.trainingLoad, unit: "count",
      confidence: "medium", periodStart: date, periodEnd: date, rawPayloadId,
      normalisedAt: now, normalisationVersion: "1.0.0", processingState: "normalised",
      organisationId: "", createdAt: now, updatedAt: now,
    });
  }

  return metrics;
}
