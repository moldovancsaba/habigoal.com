import { describe, expect, it } from "vitest";
import {
  classifyDataConfidence,
  classifyFreshness,
  minConfidenceBand,
  normalizeConfidenceBand,
  CONFIDENCE_BAND_RANK,
} from "./data-confidence";

const NOW = Date.parse("2026-06-29T12:00:00.000Z");
const hoursAgo = (h: number) => new Date(NOW - h * 3600_000).toISOString();

describe("normalizeConfidenceBand", () => {
  it("maps legacy strings onto the canonical band", () => {
    expect(normalizeConfidenceBand("high")).toBe("high");
    expect(normalizeConfidenceBand("MEDIUM")).toBe("medium");
    expect(normalizeConfidenceBand("low")).toBe("low");
    // 'insufficient', unknown, null, empty all collapse to none.
    expect(normalizeConfidenceBand("insufficient")).toBe("none");
    expect(normalizeConfidenceBand("bogus")).toBe("none");
    expect(normalizeConfidenceBand(null)).toBe("none");
    expect(normalizeConfidenceBand(undefined)).toBe("none");
  });
});

describe("minConfidenceBand (weakest link)", () => {
  it("returns the lowest band across inputs", () => {
    expect(minConfidenceBand(["high", "medium", "low"])).toBe("low");
    expect(minConfidenceBand(["high", "high"])).toBe("high");
    expect(minConfidenceBand(["high", "insufficient"])).toBe("none");
    expect(minConfidenceBand([])).toBe("none");
  });
});

describe("classifyFreshness", () => {
  it("classifies by age, and missing when no timestamp", () => {
    expect(classifyFreshness(hoursAgo(1), NOW)).toBe("fresh");
    expect(classifyFreshness(hoursAgo(48), NOW)).toBe("recent");
    expect(classifyFreshness(hoursAgo(100), NOW)).toBe("stale");
    expect(classifyFreshness(null, NOW)).toBe("missing");
    expect(classifyFreshness("not-a-date", NOW)).toBe("missing");
  });
});

describe("classifyDataConfidence", () => {
  it("returns none + missingData when there is no sample or no timestamp", () => {
    const r = classifyDataConfidence({ sampleSize: 0, now: NOW, lastUpdatedAt: hoursAgo(1) });
    expect(r.band).toBe("none");
    expect(r.reasonKeys).toEqual(["missingData"]);

    const r2 = classifyDataConfidence({ sampleSize: 5, now: NOW, lastUpdatedAt: null });
    expect(r2.band).toBe("none");
    expect(r2.freshness).toBe("missing");
  });

  it("rates fresh multi-source rich history as high", () => {
    const r = classifyDataConfidence({ sampleSize: 7, sourceCount: 2, now: NOW, lastUpdatedAt: hoursAgo(2) });
    expect(r.band).toBe("high");
    expect(r.reasonKeys).toContain("multiSource");
    expect(r.reasonKeys).toContain("fresh");
  });

  it("flags single-source and low-sample, capping the band", () => {
    const lowSample = classifyDataConfidence({ sampleSize: 1, sourceCount: 1, now: NOW, lastUpdatedAt: hoursAgo(2) });
    expect(lowSample.band).toBe("low");
    expect(lowSample.reasonKeys).toContain("lowSample");
    expect(lowSample.reasonKeys).toContain("singleSource");

    // 7 samples but a single source can't reach high.
    const singleSource = classifyDataConfidence({ sampleSize: 7, sourceCount: 1, now: NOW, lastUpdatedAt: hoursAgo(2) });
    expect(singleSource.band).toBe("medium");
  });

  it("downgrades stale data one band and records the reason", () => {
    const stale = classifyDataConfidence({ sampleSize: 7, sourceCount: 2, now: NOW, lastUpdatedAt: hoursAgo(200) });
    expect(stale.freshness).toBe("stale");
    expect(stale.band).toBe("medium"); // high -> medium
    expect(stale.reasonKeys).toContain("stale");
  });

  it("keeps band ranks ordered", () => {
    expect(CONFIDENCE_BAND_RANK.none).toBeLessThan(CONFIDENCE_BAND_RANK.low);
    expect(CONFIDENCE_BAND_RANK.low).toBeLessThan(CONFIDENCE_BAND_RANK.medium);
    expect(CONFIDENCE_BAND_RANK.medium).toBeLessThan(CONFIDENCE_BAND_RANK.high);
  });
});
