import { describe, expect, it } from "vitest";
import { deriveConnectionStatus, latestMetricsByKey, toMetricChips, WEARABLE_STALE_MS } from "@/lib/wearable-dashboard-view";
import type { CanonicalMetric, CanonicalMetricKey } from "@/types/canonical-metric";

const now = new Date("2026-06-28T12:00:00.000Z");

function metric(key: CanonicalMetricKey, value: number, date: string): CanonicalMetric {
  return { metricId: `m:${key}:${date}`, athleteId: "a1", organisationId: "org", source: "oura", sourceMetric: "x", canonicalKey: key, value, unit: "ms", confidence: "high", periodStart: `${date}T00:00:00.000Z`, periodEnd: `${date}T23:59:59.999Z`, date, normalisedAt: now.toISOString(), normalisationVersion: "v", processingState: "normalised", createdAt: now.toISOString(), updatedAt: now.toISOString() };
}

describe("latestMetricsByKey / toMetricChips", () => {
  it("keeps the newest metric per key and orders configured chips", () => {
    const metrics = [
      metric("hrv_rmssd_ms", 60, "2026-06-26"),
      metric("hrv_rmssd_ms", 72, "2026-06-28"),
      metric("resting_heart_rate_bpm", 48, "2026-06-28")
    ];
    expect(latestMetricsByKey(metrics).get("hrv_rmssd_ms")?.value).toBe(72);

    const chips = toMetricChips(metrics);
    expect(chips.map((c) => c.key)).toEqual(["hrv_rmssd_ms", "resting_heart_rate_bpm"]);
    expect(chips[0]).toEqual({ key: "hrv_rmssd_ms", value: 72, unit: "ms" });
  });

  it("omits keys that are not in the configured summary set", () => {
    const chips = toMetricChips([metric("jump_height_cm", 40, "2026-06-28")]);
    expect(chips).toHaveLength(0);
  });
});

describe("deriveConnectionStatus", () => {
  it("maps revoked -> needs_reauth and error states", () => {
    expect(deriveConnectionStatus({ status: "revoked" }, now)).toBe("needs_reauth");
    expect(deriveConnectionStatus({ status: "error" }, now)).toBe("error");
    expect(deriveConnectionStatus({ status: "active", lastSyncStatus: "error", lastSyncAt: now.toISOString() }, now)).toBe("error");
  });

  it("reports never when not yet synced", () => {
    expect(deriveConnectionStatus({ status: "active" }, now)).toBe("never");
    expect(deriveConnectionStatus({ status: "active", lastSyncStatus: "never" }, now)).toBe("never");
  });

  it("flags a stale sync and a fresh sync", () => {
    const stale = new Date(now.getTime() - WEARABLE_STALE_MS - 1000).toISOString();
    expect(deriveConnectionStatus({ status: "active", lastSyncStatus: "ok", lastSyncAt: stale }, now)).toBe("stale");
    const fresh = new Date(now.getTime() - 60_000).toISOString();
    expect(deriveConnectionStatus({ status: "active", lastSyncStatus: "ok", lastSyncAt: fresh }, now)).toBe("connected");
  });
});
