// Pure logic for the VALD performance webhook: HMAC signature verification and
// normalization of a VALD event into CanonicalMetric rows. No I/O — unit-testable
// in isolation. The route wires this to env (secret), athlete mapping, and the
// raw/canonical repositories.
//
// VALD → canonical mapping table (ForceDecks-style results):
//   results.peakForceNewtons          → peak_force_newtons              (newtons)
//   results.jumpHeightCm              → jump_height_cm                  (centimeters)
//   results.leftRightAsymmetryPct     → left_right_asymmetry_percentage (percentage)
//
// Idempotency: metricId is deterministic (`${athleteId}:${date}:vald:${key}`),
// so a re-delivered event overwrites rather than duplicating.

import { createHmac, timingSafeEqual } from "crypto";
import type { CanonicalMetric, CanonicalMetricKey, MetricUnit, RawPayload } from "@/types/canonical-metric";

export const VALD_NORMALISATION_VERSION = "vald-1.0.0";

export type ValdEvent = {
  eventId: string;
  athleteId?: string;
  providerAthleteId?: string;
  testDateUtc?: string;
  results?: Record<string, unknown>;
};

// Constant-time HMAC-SHA256 verification over the raw request body. The provided
// signature header may be a bare hex digest or `sha256=<hex>`.
export function verifyValdSignature(rawBody: string, secret: string, signatureHeader: string | null | undefined): boolean {
  if (!signatureHeader) return false;
  const provided = signatureHeader.startsWith("sha256=") ? signatureHeader.slice(7) : signatureHeader;
  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

type FieldMapping = { field: string; canonicalKey: CanonicalMetricKey; unit: MetricUnit };

const VALD_MAPPINGS: FieldMapping[] = [
  { field: "peakForceNewtons", canonicalKey: "peak_force_newtons", unit: "newtons" },
  { field: "jumpHeightCm", canonicalKey: "jump_height_cm", unit: "centimeters" },
  { field: "leftRightAsymmetryPct", canonicalKey: "left_right_asymmetry_percentage", unit: "percentage" }
];

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function rawPayloadFromVald(event: ValdEvent, athleteId: string, rawBody: string, now: Date): RawPayload {
  return {
    payloadId: `vald:${event.eventId}`,
    athleteId,
    source: "vald",
    receivedAt: now.toISOString(),
    payload: { eventId: event.eventId, body: rawBody },
    normalised: false
  };
}

export function normalizeValdEvent(event: ValdEvent, athleteId: string, organisationId: string, now: Date = new Date()): CanonicalMetric[] {
  const results = (event.results ?? {}) as Record<string, unknown>;
  const day = typeof event.testDateUtc === "string" && /^\d{4}-\d{2}-\d{2}/.test(event.testDateUtc) ? event.testDateUtc.slice(0, 10) : null;
  if (!day) return [];
  const nowIso = now.toISOString();
  const metrics: CanonicalMetric[] = [];

  for (const mapping of VALD_MAPPINGS) {
    const value = asNumber(results[mapping.field]);
    if (value === null) continue;
    metrics.push({
      metricId: `${athleteId}:${day}:vald:${mapping.canonicalKey}`,
      athleteId,
      organisationId,
      source: "vald",
      sourceMetric: `vald.${mapping.field}`,
      canonicalKey: mapping.canonicalKey,
      value,
      unit: mapping.unit,
      confidence: "high",
      periodStart: `${day}T00:00:00.000Z`,
      periodEnd: `${day}T23:59:59.999Z`,
      date: day,
      rawPayloadId: `vald:${event.eventId}`,
      normalisedAt: nowIso,
      normalisationVersion: VALD_NORMALISATION_VERSION,
      processingState: "normalised",
      createdAt: nowIso,
      updatedAt: nowIso
    });
  }

  return metrics;
}
