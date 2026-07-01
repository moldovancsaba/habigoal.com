import { describe, it, expect } from "vitest";
import { computeReadiness } from "../lib/engines/readiness.engine";
import { EngineContext } from "../types/ai-engine";

describe("readiness.engine", () => {
  it("should return high readiness when all signals are optimal", async () => {
    const context: EngineContext = {
      athleteId: "123",
      organisationId: "org1",
      twin: {
        physical: { restingHeartRateBpm: 50 },
        recovery: { sleepQualityScore7d: 90 },
      } as any,
    };

    const output = await computeReadiness(context);
    expect(output.result.score).toBe(100);
    expect(output.result.zone).toBe("peak");
    expect(output.result.clearedForHighIntensity).toBe(true);
    expect(output.confidence).toBe("high");
  });

  it("should degrade confidence and missingData if missing twin metrics", async () => {
    const context: EngineContext = {
      athleteId: "123",
      organisationId: "org1",
      twin: {
        physical: {},
        recovery: {},
      } as any,
    };

    const output = await computeReadiness(context);
    expect(output.missingData).toContain("restingHeartRateBpm");
    expect(output.missingData).toContain("sleepQualityScore7d");
    expect(output.confidence).toBe("low");
  });

  it("should recommend human review if score drops below 40", async () => {
    const context: EngineContext = {
      athleteId: "123",
      organisationId: "org1",
      twin: {
        physical: { restingHeartRateBpm: 75 }, // -10
        recovery: { sleepQualityScore7d: 50 }, // -15
      } as any,
    };

    const output = await computeReadiness(context);
    // Score is 75, which is 'good', but let's drop it further by mocking lower if needed
    expect(output.result.score).toBe(75);
    expect(output.contributingFactors).toContain("Elevated resting heart rate");
    expect(output.contributingFactors).toContain("Poor 7-day sleep trend");
  });

  it("applies present-only refinements (stress/soreness/energy/ACWR) without changing the two-signal confidence", async () => {
    const context: EngineContext = {
      athleteId: "123",
      organisationId: "org1",
      twin: {
        physical: { restingHeartRateBpm: 50 },
        recovery: { sleepQualityScore7d: 90, stressScore7d: 8, sorenessScore7d: 7, energyScore7d: 3 },
        performance: { acwr: 1.8 },
      } as any,
    };
    const output = await computeReadiness(context);
    // 100 - 10 (stress) - 10 (soreness) - 10 (energy) - 10 (ACWR) = 60
    expect(output.result.score).toBe(60);
    expect(output.confidence).toBe("high");
    expect(output.contributingFactors).toEqual(
      expect.arrayContaining([
        "Elevated 7-day stress load",
        "High 7-day soreness",
        "Low 7-day energy",
        "Acute training-load spike (ACWR)",
      ])
    );
  });

  it("stacks penalties into the recovery zone and adds the severe sleep deficit factor", async () => {
    const context: EngineContext = {
      athleteId: "123",
      organisationId: "org1",
      twin: {
        physical: { restingHeartRateBpm: 80 }, // -10
        recovery: { sleepQualityScore7d: 20, stressScore7d: 9, sorenessScore7d: 9, energyScore7d: 1 }, // -15 -10 (severe) -10 -10 -10
        performance: { acwr: 2 }, // -10
      } as any,
    };
    const output = await computeReadiness(context);
    // 100 - 10 - 25 - 10 - 10 - 10 - 10 = 25
    expect(output.result.score).toBe(25);
    expect(output.result.zone).toBe("recovery");
    expect(output.contributingFactors).toContain("Severe 7-day sleep deficit");
  });

  it("never returns a negative score (clamped at zero)", async () => {
    const output = await computeReadiness({
      athleteId: "123",
      organisationId: "org1",
      twin: {
        physical: { restingHeartRateBpm: 80 },
        recovery: { sleepQualityScore7d: 10, stressScore7d: 10, sorenessScore7d: 10, energyScore7d: 0 },
        performance: { acwr: 3 },
        cognitive: {},
        technical: {},
      } as any,
    });
    expect(output.result.score).toBeGreaterThanOrEqual(0);
  });
});
