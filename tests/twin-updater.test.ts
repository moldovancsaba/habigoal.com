import { describe, it, expect } from "vitest";
import { updateRecoveryDimension, updatePerformanceDimension } from "../lib/twin-updater";
import { CanonicalMetric } from "../types/canonical-metric";

describe("twin-updater", () => {
  it("should update recovery dimension from canonical metrics", () => {
    const existing = {
      updatedAt: "2023-10-01",
      sources: [],
      confidence: "low",
    } as any;

    const metrics: CanonicalMetric[] = [
      { canonicalKey: "sleep_quality_score", value: 80, source: "oura" } as any,
      { canonicalKey: "mood_score", value: 7, source: "check_in" } as any,
    ];

    const updated = updateRecoveryDimension(existing, metrics, "2023-10-02");

    expect(updated.updatedAt).toBe("2023-10-02");
    expect(updated.sleepQualityScore7d).toBe(80);
    expect(updated.moodScore7d).toBe(7);
    expect(updated.sources).toContain("oura");
    expect(updated.sources).toContain("check_in");
    expect(updated.confidence).toBe("medium"); // Since there are 2 sources
  });

  it("should calculate acwr securely in performance dimension", () => {
    const existing = {
      updatedAt: "2023-10-01",
      sources: ["check_in"],
      confidence: "medium",
      chronicLoad28d: 2000,
      acuteLoad7d: 1500,
    } as any;

    const metrics: CanonicalMetric[] = [
      { canonicalKey: "internal_load_points", value: 500, source: "check_in" } as any,
    ];

    const updated = updatePerformanceDimension(existing, metrics, "2023-10-02");

    expect(updated.acuteLoad7d).toBe(2000); // 1500 + 500
    expect(updated.acwr).toBe(1); // 2000 / 2000
    expect(updated.sources).toContain("check_in");
  });
});
