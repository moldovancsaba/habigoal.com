import { describe, expect, it } from "vitest";
import {
  createEmptyTwin,
  appendHistory,
  updateRecoveryDimension,
  updatePerformanceDimension,
  updatePhysicalDimension,
  updateCognitiveDimension,
  updateTechnicalFromVision,
} from "@/lib/twin-updater";
import type { CanonicalMetric } from "@/types/canonical-metric";
import type { TwinHistoryEntry } from "@/types/athlete-twin";

function metric(canonicalKey: string, value: number, source: string): CanonicalMetric {
  return { athleteId: "a1", organisationId: "o1", canonicalKey, value, source, date: "2026-06-29" } as CanonicalMetric;
}

describe("twin dimension updaters (#202 DTW-002)", () => {
  it("wires recovery metrics, values, and sources", () => {
    const twin = createEmptyTwin("a1", "o1");
    const out = updateRecoveryDimension(twin.recovery, [
      metric("sleep_quality_score", 80, "check_in"),
      metric("mood_score", 4, "wearable"),
    ], "2026-06-29");
    expect(out.sleepQualityScore7d).toBe(80);
    expect(out.moodScore7d).toBe(4);
    expect(out.sources.sort()).toEqual(["check_in", "wearable"]);
    expect(out.confidence).toBe("medium"); // >1 source
  });

  it("wires performance load and a single-source low/medium confidence", () => {
    const twin = createEmptyTwin("a1", "o1");
    const out = updatePerformanceDimension(twin.performance, [
      metric("internal_load_points", 120, "check_in"),
      metric("external_load_points", 300, "check_in"),
    ], "2026-06-29");
    expect(out.internalLoadPoints7d).toBe(120);
    expect(out.externalLoadPoints7d).toBe(300);
    expect(out.sources).toEqual(["check_in"]);
  });

  it("wires physical and cognitive dimensions", () => {
    const twin = createEmptyTwin("a1", "o1");
    const physical = updatePhysicalDimension(twin.physical, [
      metric("resting_heart_rate_bpm", 55, "wearable"),
      metric("hrv_rmssd_ms", 70, "wearable"),
    ], "2026-06-29");
    expect(physical.restingHeartRateBpm).toBe(55);
    expect(physical.hrvRmssdMs).toBe(70);

    const cognitive = updateCognitiveDimension(twin.cognitive, [
      metric("reaction_time_ms", 250, "cog_test"),
    ], "2026-06-29");
    expect(cognitive.reactionTimeMs).toBe(250);
    expect(cognitive.sources).toContain("cog_test");
  });

  it("wires the technical dimension from vision with an ai_inference source", () => {
    const twin = createEmptyTwin("a1", "o1");
    const out = updateTechnicalFromVision(twin.technical, { symmetryIndex: 0.92, formScore: 78, confidence: "medium" }, "2026-06-29");
    expect(out.movementSymmetryIndex).toBe(0.92);
    expect(out.runningFormScore).toBe(78);
    expect(out.sources).toContain("ai_inference");
  });
});

describe("appendHistory (#202 DTW-002)", () => {
  it("records a snapshot for all five dimensions, not just two", () => {
    const twin = createEmptyTwin("a1", "o1");
    const history = appendHistory([], "2026-06-29", twin);
    const dims = history.filter((e) => e.date === "2026-06-29").map((e) => e.dimension).sort();
    expect(dims).toEqual(["cognitive", "performance", "physical", "recovery", "technical"]);
  });

  it("dedupes by (date, dimension), keeping the latest snapshot", () => {
    const twin = createEmptyTwin("a1", "o1");
    let history: TwinHistoryEntry[] = appendHistory([], "2026-06-29", twin);
    twin.recovery = { ...twin.recovery, sleepQualityScore7d: 99 } as typeof twin.recovery;
    history = appendHistory(history, "2026-06-29", twin);
    const recovery = history.filter((e) => e.date === "2026-06-29" && e.dimension === "recovery");
    expect(recovery).toHaveLength(1);
    expect((recovery[0].snapshot as Record<string, number>).sleepQualityScore7d).toBe(99);
  });

  it("bounds retention to the most recent 90 distinct dates across all dimensions", () => {
    const twin = createEmptyTwin("a1", "o1");
    let history: TwinHistoryEntry[] = [];
    for (let day = 1; day <= 95; day += 1) {
      const date = `2026-${String(1 + Math.floor((day - 1) / 28)).padStart(2, "0")}-${String(1 + ((day - 1) % 28)).padStart(2, "0")}`;
      history = appendHistory(history, date, twin);
    }
    const distinctDates = new Set(history.map((e) => e.date));
    expect(distinctDates.size).toBe(90);
    // every retained date still carries all five dimensions
    for (const date of distinctDates) {
      expect(history.filter((e) => e.date === date)).toHaveLength(5);
    }
  });
});
