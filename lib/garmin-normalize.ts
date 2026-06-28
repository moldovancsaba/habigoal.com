// Pure normalization of Garmin raw payloads into CanonicalMetric rows. No I/O —
// unit-testable in isolation. Each RawPayload.payload carries a `garminType`
// discriminator plus the resource fields, so normalization is deterministic.
//
// Garmin → canonical mapping table (Health API summaries):
//   dailies.restingHeartRateInBeatsPerMinute → resting_heart_rate_bpm (bpm)
//   dailies.averageStressLevel               → stress_score           (score_0_100)
//   dailies.bodyBatteryHighestValue          → energy_score           (score_0_100)
//   hrv.lastNightAvgHrvInMs / hrv.avgHrvInMs → hrv_rmssd_ms           (ms)
//   sleep.durationInSeconds                  → sleep_duration_minutes (minutes; sec/60)
//   sleep.sleepScore                         → sleep_quality_score    (score_0_100)
//
// metricId is deterministic (`${athleteId}:${date}:garmin:${canonicalKey}`), so
// re-syncing the same day overwrites rather than duplicating.

import type { CanonicalMetric, CanonicalMetricKey, MetricUnit, RawPayload } from "@/types/canonical-metric";

export const GARMIN_NORMALISATION_VERSION = "garmin-1.0.0";

type FieldMapping = {
  field: string;
  canonicalKey: CanonicalMetricKey;
  unit: MetricUnit;
  transform?: (value: number) => number;
};

const GARMIN_MAPPINGS: Record<string, FieldMapping[]> = {
  dailies: [
    { field: "restingHeartRateInBeatsPerMinute", canonicalKey: "resting_heart_rate_bpm", unit: "bpm" },
    { field: "averageStressLevel", canonicalKey: "stress_score", unit: "score_0_100" },
    { field: "bodyBatteryHighestValue", canonicalKey: "energy_score", unit: "score_0_100" }
  ],
  hrv: [{ field: "lastNightAvgHrvInMs", canonicalKey: "hrv_rmssd_ms", unit: "ms" }],
  sleep: [
    { field: "durationInSeconds", canonicalKey: "sleep_duration_minutes", unit: "minutes", transform: (v) => Math.round(v / 60) },
    { field: "sleepScore", canonicalKey: "sleep_quality_score", unit: "score_0_100" }
  ]
};

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function normalizeGarminPayloads(
  payloads: RawPayload[],
  connection: { athleteId: string; organisationId: string },
  now: Date = new Date()
): CanonicalMetric[] {
  const nowIso = now.toISOString();
  const metrics: CanonicalMetric[] = [];

  for (const raw of payloads) {
    const body = (raw.payload ?? {}) as Record<string, unknown>;
    const garminType = typeof body.garminType === "string" ? body.garminType : "";
    const mappings = GARMIN_MAPPINGS[garminType];
    if (!mappings) continue;

    const day = typeof body.day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.day) ? body.day : null;
    if (!day) continue;

    for (const mapping of mappings) {
      const value = asNumber(body[mapping.field]);
      if (value === null) continue;
      const finalValue = mapping.transform ? mapping.transform(value) : value;

      metrics.push({
        metricId: `${connection.athleteId}:${day}:garmin:${mapping.canonicalKey}`,
        athleteId: connection.athleteId,
        organisationId: connection.organisationId,
        source: "garmin",
        sourceMetric: `${garminType}.${mapping.field}`,
        canonicalKey: mapping.canonicalKey,
        value: finalValue,
        unit: mapping.unit,
        confidence: "high",
        periodStart: `${day}T00:00:00.000Z`,
        periodEnd: `${day}T23:59:59.999Z`,
        date: day,
        rawPayloadId: raw.payloadId,
        normalisedAt: nowIso,
        normalisationVersion: GARMIN_NORMALISATION_VERSION,
        processingState: "normalised",
        createdAt: nowIso,
        updatedAt: nowIso
      });
    }
  }

  return metrics;
}
