import { describe, expect, it } from "vitest";
import {
  sourceTrust,
  ageHours,
  classifyFreshness,
  describeMeasurement,
  DEFAULT_FRESHNESS,
} from "@/lib/measurement-normalization";
import type { CanonicalMetric } from "@/types/canonical-metric";

const NOW = new Date("2026-06-29T12:00:00.000Z");

function metric(partial: Partial<CanonicalMetric>): CanonicalMetric {
  return {
    metricId: "m1",
    athleteId: "a1",
    organisationId: "default",
    source: "oura",
    sourceMetric: "hrv",
    canonicalKey: "hrv_rmssd_ms",
    value: 60,
    unit: "ms",
    confidence: "high",
    periodStart: "2026-06-29T00:00:00.000Z",
    periodEnd: "2026-06-29T08:00:00.000Z",
    date: "2026-06-29",
    normalisedAt: "2026-06-29T08:05:00.000Z",
    normalisationVersion: "1.0.0",
    processingState: "normalised",
    createdAt: "2026-06-29T08:05:00.000Z",
    updatedAt: "2026-06-29T08:05:00.000Z",
    ...partial,
  };
}

describe("sourceTrust (#283)", () => {
  it("classifies devices, manual entry, and AI inference", () => {
    expect(sourceTrust("oura")).toBe("device");
    expect(sourceTrust("catapult")).toBe("device");
    expect(sourceTrust("manual_coach")).toBe("manual");
    expect(sourceTrust("check_in")).toBe("manual");
    expect(sourceTrust("ai_inference")).toBe("inferred");
  });
});

describe("ageHours / classifyFreshness (#283)", () => {
  it("computes elapsed hours and never goes negative", () => {
    expect(ageHours("2026-06-29T08:00:00.000Z", NOW)).toBe(4);
    expect(ageHours("2026-06-30T00:00:00.000Z", NOW)).toBe(0); // future clamps to 0
  });

  it("returns Infinity for an unparseable timestamp", () => {
    expect(ageHours("not-a-date", NOW)).toBe(Infinity);
  });

  it("classifies fresh / stale / expired at the boundaries", () => {
    expect(classifyFreshness("2026-06-29T08:00:00.000Z", NOW)).toBe("fresh"); // 4h
    expect(classifyFreshness("2026-06-27T18:00:00.000Z", NOW)).toBe("stale"); // ~42h
    expect(classifyFreshness("2026-06-24T00:00:00.000Z", NOW)).toBe("expired"); // >72h
  });
});

describe("describeMeasurement (#283)", () => {
  it("does not caution a fresh, high-confidence device metric", () => {
    const d = describeMeasurement(metric({}), NOW);
    expect(d.sourceTrust).toBe("device");
    expect(d.freshness).toBe("fresh");
    expect(d.cautioned).toBe(false);
  });

  it("cautions an AI-inferred value even when fresh and high-confidence", () => {
    const d = describeMeasurement(metric({ source: "ai_inference" }), NOW);
    expect(d.sourceTrust).toBe("inferred");
    expect(d.cautioned).toBe(true);
  });

  it("cautions a stale or low/unknown-confidence value", () => {
    expect(describeMeasurement(metric({ periodEnd: "2026-06-26T00:00:00.000Z" }), NOW).cautioned).toBe(true);
    expect(describeMeasurement(metric({ confidence: "low" }), NOW).cautioned).toBe(true);
    expect(describeMeasurement(metric({ confidence: "unknown" }), NOW).cautioned).toBe(true);
  });

  it("falls back to the date when periodEnd is absent", () => {
    const d = describeMeasurement(metric({ periodEnd: "", date: "2026-06-29" }), NOW);
    expect(d.freshness).toBe("fresh"); // 2026-06-29T00:00Z is 12h old
  });

  it("uses the default freshness thresholds", () => {
    expect(DEFAULT_FRESHNESS).toEqual({ freshMaxHours: 24, staleMaxHours: 72 });
  });
});
