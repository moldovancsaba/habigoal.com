// Pure view-model for the wearables dashboard: reduces recent canonical metrics
// to one labelled chip per key, and derives a display status per connection.
// No I/O — unit-testable in isolation.

import type { CanonicalMetric, CanonicalMetricKey } from "@/types/canonical-metric";
import type { DeviceConnection } from "@/types/wearable-connector";

export const WEARABLE_STALE_MS = 48 * 60 * 60 * 1000;

export type WearableConnectionStatus = "connected" | "stale" | "error" | "needs_reauth" | "never";

// The compact recent-metrics summary surfaced on the dashboard (deep analytics
// live in the twin/reports). `unit` is a universal symbol, not localized; the
// label is resolved from `Wearables.metricLabel.<key>`.
export const WEARABLE_METRIC_CHIPS: Array<{ key: CanonicalMetricKey; unit: string }> = [
  { key: "hrv_rmssd_ms", unit: "ms" },
  { key: "resting_heart_rate_bpm", unit: "bpm" },
  { key: "sleep_duration_minutes", unit: "min" },
  { key: "sleep_quality_score", unit: "" },
  { key: "sleep_efficiency_percentage", unit: "%" },
  { key: "energy_score", unit: "" },
  { key: "total_distance_meters", unit: "m" },
  { key: "internal_load_points", unit: "" }
];

export type MetricChip = { key: CanonicalMetricKey; value: number; unit: string };

// Latest metric per canonical key (by measurement period, falling back to date).
export function latestMetricsByKey(metrics: CanonicalMetric[]): Map<CanonicalMetricKey, CanonicalMetric> {
  const latest = new Map<CanonicalMetricKey, CanonicalMetric>();
  for (const metric of metrics) {
    const current = latest.get(metric.canonicalKey);
    const stamp = metric.periodEnd || metric.date || "";
    const currentStamp = current ? current.periodEnd || current.date || "" : "";
    if (!current || stamp > currentStamp) latest.set(metric.canonicalKey, metric);
  }
  return latest;
}

// Ordered chips for the configured summary keys that have a recent value.
export function toMetricChips(metrics: CanonicalMetric[]): MetricChip[] {
  const latest = latestMetricsByKey(metrics);
  const chips: MetricChip[] = [];
  for (const def of WEARABLE_METRIC_CHIPS) {
    const metric = latest.get(def.key);
    if (!metric || typeof metric.value !== "number") continue;
    chips.push({ key: def.key, value: metric.value, unit: def.unit });
  }
  return chips;
}

export function deriveConnectionStatus(
  connection: Pick<DeviceConnection, "status" | "lastSyncAt" | "lastSyncStatus">,
  now: Date = new Date()
): WearableConnectionStatus {
  if (connection.status === "revoked") return "needs_reauth";
  if (connection.status === "error" || connection.lastSyncStatus === "error") return "error";
  if (!connection.lastSyncAt || connection.lastSyncStatus === "never" || !connection.lastSyncStatus) return "never";
  const last = Date.parse(connection.lastSyncAt);
  if (Number.isFinite(last) && now.getTime() - last > WEARABLE_STALE_MS) return "stale";
  return "connected";
}
