import { describe, expect, it } from "vitest";
import { computeInjuryRisk } from "@/lib/engines/injury-risk.engine";
import { buildFmsScreen } from "@/lib/athleteiq-fms";
import type { AthleteTwin } from "@/types/athlete-twin";
import type { EngineContext } from "@/types/ai-engine";
import { FMS_SUBTESTS, type FmsScores } from "@/types/athleteiq-fms";

// The engine only reads twin.performance?.acwr and twin.physical?.leftRightAsymmetryPct.
function twinStub(overrides: Partial<AthleteTwin> = {}): AthleteTwin {
  return { performance: {}, physical: {}, ...overrides } as unknown as AthleteTwin;
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
