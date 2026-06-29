import type { CanonicalMetric, MetricSource, MetricUnit, CanonicalMetricKey } from "@/types/canonical-metric";

// Measurement adapter layer (#283, AIQ-1361). The canonical metric model already
// normalizes value/unit/source/confidence; this adds the cross-cutting metadata
// the issue requires to be *visible where relevant* — source trust class and
// data freshness — and folds them into one render-ready descriptor with an
// honest "cautioned" flag so a number is never presented as a hard verified fact
// when it is stale, low-confidence, or AI-inferred. No data is fabricated.

export type Freshness = "fresh" | "stale" | "expired";
export type SourceTrust = "device" | "manual" | "inferred";

// Maps each measurement source to a trust class so the UI can label whether a
// number came from a sensor/device, a human (coach or self check-in), or an AI
// inference.
export function sourceTrust(source: MetricSource): SourceTrust {
  if (source === "ai_inference") return "inferred";
  if (source === "manual_coach" || source === "check_in") return "manual";
  return "device";
}

// Hours elapsed since an ISO timestamp (or day string). Returns Infinity for an
// unparseable input so it classifies as expired rather than silently "fresh".
export function ageHours(iso: string, now: Date): number {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return Infinity;
  return Math.max(0, (now.getTime() - t) / 3_600_000);
}

export type FreshnessThresholds = { freshMaxHours: number; staleMaxHours: number };

// Daily-cadence default: within a day is fresh, within three days is stale,
// older is expired. Callers can override per metric cadence.
export const DEFAULT_FRESHNESS: FreshnessThresholds = { freshMaxHours: 24, staleMaxHours: 72 };

export function classifyFreshness(
  iso: string,
  now: Date,
  thresholds: FreshnessThresholds = DEFAULT_FRESHNESS
): Freshness {
  const h = ageHours(iso, now);
  if (h <= thresholds.freshMaxHours) return "fresh";
  if (h <= thresholds.staleMaxHours) return "stale";
  return "expired";
}

export type MeasurementDescriptor = {
  canonicalKey: CanonicalMetricKey;
  value: number;
  unit: MetricUnit;
  source: MetricSource;
  sourceTrust: SourceTrust;
  confidence: CanonicalMetric["confidence"];
  freshness: Freshness;
  ageHours: number;
  // True when the value should carry a caution in the UI — i.e. not fresh, low/
  // unknown confidence, or AI-inferred — so lite/future/derived data is never
  // shown as an active verified measurement.
  cautioned: boolean;
};

export function describeMeasurement(
  metric: CanonicalMetric,
  now: Date,
  thresholds: FreshnessThresholds = DEFAULT_FRESHNESS
): MeasurementDescriptor {
  const reference = metric.periodEnd || metric.date;
  const trust = sourceTrust(metric.source);
  const freshness = classifyFreshness(reference, now, thresholds);
  const age = ageHours(reference, now);
  const cautioned =
    freshness !== "fresh" ||
    metric.confidence === "low" ||
    metric.confidence === "unknown" ||
    trust === "inferred";

  return {
    canonicalKey: metric.canonicalKey,
    value: metric.value,
    unit: metric.unit,
    source: metric.source,
    sourceTrust: trust,
    confidence: metric.confidence,
    freshness,
    ageHours: Number.isFinite(age) ? Math.round(age * 10) / 10 : age,
    cautioned,
  };
}
