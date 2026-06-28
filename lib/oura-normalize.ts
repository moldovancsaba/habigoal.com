// Pure normalization of Oura raw payloads into CanonicalMetric rows. No I/O —
// unit-testable in isolation. The wearable sync engine fetches raw payloads via
// the Oura connector and hands them here.
//
// Convention: each RawPayload.payload carries an `ouraType` discriminator plus
// the provider fields for that resource, so normalization is deterministic and
// does not depend on payload ordering.
//
// Oura → canonical mapping table (Oura API v2):
//   daily_sleep.score            → sleep_quality_score          (score_0_100)
//   sleep.total_sleep_duration   → sleep_duration_minutes       (minutes; sec/60)
//   sleep.efficiency             → sleep_efficiency_percentage  (percentage)
//   sleep.average_hrv            → hrv_rmssd_ms                 (ms)
//   sleep.lowest_heart_rate      → resting_heart_rate_bpm       (bpm)
//   daily_readiness.score        → energy_score                (score_0_100)
//
// Idempotency: metricId is deterministic `${athleteId}:${date}:oura:${canonicalKey}`,
// so re-syncing the same day overwrites rather than duplicates.

import type { CanonicalMetric, CanonicalMetricKey, MetricUnit, RawPayload } from "@/types/canonical-metric";

export const OURA_NORMALISATION_VERSION = "oura-1.0.0";

type FieldMapping = {
  field: string;
  canonicalKey: CanonicalMetricKey;
  unit: MetricUnit;
  transform?: (value: number) => number;
};

const OURA_MAPPINGS: Record<string, FieldMapping[]> = {
  daily_sleep: [{ field: "score", canonicalKey: "sleep_quality_score", unit: "score_0_100" }],
  sleep: [
    { field: "total_sleep_duration", canonicalKey: "sleep_duration_minutes", unit: "minutes", transform: (v) => Math.round(v / 60) },
    { field: "efficiency", canonicalKey: "sleep_efficiency_percentage", unit: "percentage" },
    { field: "average_hrv", canonicalKey: "hrv_rmssd_ms", unit: "ms" },
    { field: "lowest_heart_rate", canonicalKey: "resting_heart_rate_bpm", unit: "bpm" }
  ],
  daily_readiness: [{ field: "score", canonicalKey: "energy_score", unit: "score_0_100" }]
};

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function normalizeOuraPayloads(
  payloads: RawPayload[],
  connection: { athleteId: string; organisationId: string },
  now: Date = new Date()
): CanonicalMetric[] {
  const nowIso = now.toISOString();
  const metrics: CanonicalMetric[] = [];

  for (const raw of payloads) {
    const body = (raw.payload ?? {}) as Record<string, unknown>;
    const ouraType = typeof body.ouraType === "string" ? body.ouraType : "";
    const mappings = OURA_MAPPINGS[ouraType];
    if (!mappings) continue;

    const day = typeof body.day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.day) ? body.day : null;
    if (!day) continue;

    for (const mapping of mappings) {
      const value = asNumber(body[mapping.field]);
      if (value === null) continue;
      const finalValue = mapping.transform ? mapping.transform(value) : value;

      metrics.push({
        metricId: `${connection.athleteId}:${day}:oura:${mapping.canonicalKey}`,
        athleteId: connection.athleteId,
        organisationId: connection.organisationId,
        source: "oura",
        sourceMetric: `${ouraType}.${mapping.field}`,
        canonicalKey: mapping.canonicalKey,
        value: finalValue,
        unit: mapping.unit,
        confidence: "high",
        periodStart: `${day}T00:00:00.000Z`,
        periodEnd: `${day}T23:59:59.999Z`,
        date: day,
        rawPayloadId: raw.payloadId,
        normalisedAt: nowIso,
        normalisationVersion: OURA_NORMALISATION_VERSION,
        processingState: "normalised",
        createdAt: nowIso,
        updatedAt: nowIso
      });
    }
  }

  return metrics;
}
