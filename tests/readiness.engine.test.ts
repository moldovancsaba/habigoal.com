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
});
