import { describe, expect, it } from "vitest";
import { buildRecommendation } from "@/lib/engines/recommendation.engine";
import type { AthleteTwin } from "@/types/athlete-twin";
import type { EngineOutput, InjuryRiskResult, ReadinessResult, RecoveryResult } from "@/types/ai-engine";

const TWIN = {} as AthleteTwin;

function readinessOutput(zone: ReadinessResult["zone"], score: number): EngineOutput<ReadinessResult> {
  return {
    result: { score, zone, clearedForHighIntensity: score >= 70 },
    confidence: "high",
    contributingFactors: [],
    dataRecency: "current",
    missingData: [],
    humanReviewRecommended: zone === "recovery",
    generatedAt: "2026-07-01T00:00:00.000Z"
  };
}

function recoveryOutput(): EngineOutput<RecoveryResult> {
  return {
    result: { score: 80, status: "recovered", recommendedFocus: "normal" },
    confidence: "high",
    contributingFactors: [],
    dataRecency: "current",
    missingData: [],
    humanReviewRecommended: false,
    generatedAt: "2026-07-01T00:00:00.000Z"
  };
}

function injuryRiskOutput(overrides: Partial<InjuryRiskResult> = {}): EngineOutput<InjuryRiskResult> {
  return {
    result: { riskLevel: "low", flags: [], loadReductionRecommended: false, ...overrides },
    confidence: "high",
    contributingFactors: [],
    dataRecency: "current",
    missingData: [],
    humanReviewRecommended: false,
    generatedAt: "2026-07-01T00:00:00.000Z"
  };
}

describe("buildRecommendation — textKey maps 1:1 onto the readiness zone (#recommendation-i18n)", () => {
  const zones: ReadinessResult["zone"][] = ["peak", "good", "moderate", "fatigued", "recovery"];

  it.each(zones)("textKey is %s for the %s zone", (zone) => {
    const recommendation = buildRecommendation(TWIN, readinessOutput(zone, 90), recoveryOutput(), injuryRiskOutput());
    expect(recommendation.textKey).toBe(zone);
    expect(recommendation.text.length).toBeGreaterThan(0);
  });

  it("keeps textKey stable even when an injury-risk load reduction is appended to text", () => {
    const recommendation = buildRecommendation(
      TWIN,
      readinessOutput("good", 75),
      recoveryOutput(),
      injuryRiskOutput({ riskLevel: "elevated", loadReductionRecommended: true, flags: ["ACWR spike"] })
    );
    expect(recommendation.textKey).toBe("good");
    expect(recommendation.text).toContain("Load reduction recommended");
  });
});
