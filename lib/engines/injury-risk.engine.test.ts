import { describe, expect, it } from "vitest";
import { computeInjuryRisk } from "@/lib/engines/injury-risk.engine";
import { buildFmsScreen } from "@/lib/athleteiq-fms";
import type { AthleteTwin, TwinHistoryEntry } from "@/types/athlete-twin";
import type { EngineContext } from "@/types/ai-engine";
import { FMS_SUBTESTS, type FmsScores } from "@/types/athleteiq-fms";

// The engine reads twin.performance?.acwr, twin.physical?.leftRightAsymmetryPct,
// twin.recovery?.sorenessScore7d, and twin.history (performance dimension entries).
function twinStub(overrides: Partial<AthleteTwin> = {}): AthleteTwin {
  return { performance: {}, physical: {}, recovery: {}, history: [], ...overrides } as unknown as AthleteTwin;
}
function ctx(extra: Partial<EngineContext>): EngineContext {
  return { athleteId: "a1", organisationId: "default", twin: twinStub(), ...extra } as EngineContext;
}
function scores(value: number): FmsScores {
  return FMS_SUBTESTS.reduce((acc, subtest) => ({ ...acc, [subtest]: value }), {} as FmsScores);
}

describe("computeInjuryRisk FMS integration", () => {
  it("marks FMS as missing when no screen is supplied", async () => {
    const output = await computeInjuryRisk(ctx({}));
    expect(output.missingData).toContain("fms");
  });

  it("elevates risk when the FMS composite is at or below the threshold", async () => {
    const latestFms = buildFmsScreen({ athleteId: "a1", date: "2026-06-28", scores: scores(2), painFlags: {}, recordedBy: "physio" });
    expect(latestFms.composite).toBe(14);
    const output = await computeInjuryRisk(ctx({ latestFms }));
    expect(output.result.riskLevel).toBe("elevated");
    expect(output.result.flags.some((flag) => flag.includes("FMS composite below threshold"))).toBe(true);
    expect(output.missingData).not.toContain("fms");
  });

  it("flags pain and recommends human review", async () => {
    const latestFms = buildFmsScreen({ athleteId: "a1", date: "2026-06-28", scores: scores(3), painFlags: { deepSquat: true }, recordedBy: "physio" });
    const output = await computeInjuryRisk(ctx({ latestFms }));
    expect(output.humanReviewRecommended).toBe(true);
    expect(output.result.flags.some((flag) => flag.includes("FMS pain flag"))).toBe(true);
  });

  it("keeps risk low for a clean screen with no other risk factors", async () => {
    const latestFms = buildFmsScreen({ athleteId: "a1", date: "2026-06-28", scores: scores(3), painFlags: {}, recordedBy: "physio" });
    expect(latestFms.composite).toBe(21);
    const output = await computeInjuryRisk(ctx({ latestFms }));
    expect(output.result.riskLevel).toBe("low");
  });
});

describe("computeInjuryRisk present-only refinements", () => {
  function performanceHistoryEntry(date: string, acwr: number): TwinHistoryEntry {
    return { date, dimension: "performance", snapshot: { acwr } };
  }

  it("escalates risk when at least two of the last three recorded ACWR updates were elevated", async () => {
    const twin = twinStub({
      performance: { acwr: 1.2 } as AthleteTwin["performance"],
      history: [
        performanceHistoryEntry("2026-06-28", 1.8),
        performanceHistoryEntry("2026-06-27", 1.6),
        performanceHistoryEntry("2026-06-26", 1.1)
      ]
    });
    const output = await computeInjuryRisk(ctx({ twin }));
    expect(output.result.flags).toContain("Sustained ACWR elevation across multiple recent updates");
  });

  it("does not escalate on a single elevated historical reading", async () => {
    const twin = twinStub({
      performance: { acwr: 1.2 } as AthleteTwin["performance"],
      history: [performanceHistoryEntry("2026-06-28", 1.8), performanceHistoryEntry("2026-06-27", 1.1)]
    });
    const output = await computeInjuryRisk(ctx({ twin }));
    expect(output.result.flags).not.toContain("Sustained ACWR elevation across multiple recent updates");
  });

  it("flags high 7-day soreness as an injury-risk compounder", async () => {
    const twin = twinStub({ recovery: { sorenessScore7d: 8 } as AthleteTwin["recovery"] });
    const output = await computeInjuryRisk(ctx({ twin }));
    expect(output.result.flags).toContain("High 7-day soreness may compound injury risk");
  });

  it("does not flag soreness when it is within a normal range", async () => {
    const twin = twinStub({ recovery: { sorenessScore7d: 3 } as AthleteTwin["recovery"] });
    const output = await computeInjuryRisk(ctx({ twin }));
    expect(output.result.flags).not.toContain("High 7-day soreness may compound injury risk");
  });
});
