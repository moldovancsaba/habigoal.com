import { describe, expect, it } from "vitest";
import { computeRecovery } from "@/lib/engines/recovery.engine";
import type { EngineContext } from "@/types/ai-engine";

// Builds an EngineContext whose twin only sets the recovery/cognitive/physical
// fields the engine reads; everything else is irrelevant to this unit.
function ctx(twin: {
  stressTrend7d?: number;
  sorenessScore7d?: number;
  sleepQualityScore7d?: number;
  hrvRmssdMs?: number;
}): EngineContext {
  return {
    athleteId: "a1",
    organisationId: "default",
    twin: {
      cognitive: { stressTrend7d: twin.stressTrend7d },
      recovery: { sorenessScore7d: twin.sorenessScore7d, sleepQualityScore7d: twin.sleepQualityScore7d },
      physical: { hrvRmssdMs: twin.hrvRmssdMs },
    } as never,
  };
}

describe("computeRecovery — subjective + wearable merge (#209)", () => {
  it("is high recovery and high confidence when all signals are present and good", async () => {
    const out = await computeRecovery(ctx({ stressTrend7d: 2, sorenessScore7d: 2, sleepQualityScore7d: 8, hrvRmssdMs: 65 }));
    expect(out.result.score).toBe(100);
    expect(out.result.status).toBe("recovered");
    expect(out.confidence).toBe("high");
    expect(out.missingData).toHaveLength(0);
    expect(out.contributingFactors).toContain("HRV available (wearable)");
  });

  it("penalizes low sleep quality (wearable signal merged into score)", async () => {
    const out = await computeRecovery(ctx({ stressTrend7d: 2, sorenessScore7d: 2, sleepQualityScore7d: 3, hrvRmssdMs: 60 }));
    expect(out.result.score).toBe(85);
    expect(out.contributingFactors).toContain("Low sleep quality (wearable)");
  });

  it("combines subjective and wearable penalties", async () => {
    const out = await computeRecovery(ctx({ stressTrend7d: 9, sorenessScore7d: 8, sleepQualityScore7d: 3, hrvRmssdMs: 50 }));
    // 100 - 20 (stress) - 25 (soreness) - 15 (sleep) = 40 → under_recovered
    expect(out.result.score).toBe(40);
    expect(out.result.status).toBe("under_recovered");
    expect(out.result.recommendedFocus).toBe("rest");
    expect(out.humanReviewRecommended).toBe(true);
  });

  it("tracks missing wearable signals and lowers confidence", async () => {
    const out = await computeRecovery(ctx({ stressTrend7d: 2, sorenessScore7d: 2 }));
    expect(out.missingData).toEqual(expect.arrayContaining(["sleepQualityScore7d", "hrvRmssdMs"]));
    // Two subjective signals present, no wearable → medium at best, not high.
    expect(out.confidence).toBe("medium");
  });

  it("requires a wearable signal for high confidence", async () => {
    // Three subjective-ish signals but no wearable (no sleep, no HRV) → not high.
    const out = await computeRecovery(ctx({ stressTrend7d: 2, sorenessScore7d: 2 }));
    expect(out.confidence).not.toBe("high");
  });

  it("is low confidence when almost nothing is known", async () => {
    const out = await computeRecovery(ctx({}));
    expect(out.confidence).toBe("low");
    expect(out.missingData).toHaveLength(4);
  });

  it("never drives the score below zero", async () => {
    const out = await computeRecovery(ctx({ stressTrend7d: 10, sorenessScore7d: 10, sleepQualityScore7d: 0, hrvRmssdMs: 20 }));
    expect(out.result.score).toBeGreaterThanOrEqual(0);
  });
});
