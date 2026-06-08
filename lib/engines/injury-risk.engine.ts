import { EngineContext, EngineOutput, InjuryRiskResult } from "../../types/ai-engine";

export async function computeInjuryRisk(context: EngineContext): Promise<EngineOutput<InjuryRiskResult>> {
  const { twin } = context;
  const factors: string[] = [];
  const missing: string[] = [];
  let confidence: "high" | "medium" | "low" = "high";

  let riskScore = 0;

  // Check Performance (ACWR Spike)
  if (twin.performance?.acwr) {
    if (twin.performance.acwr > 1.5) {
      riskScore += 3;
      factors.push("Acute:Chronic Workload Ratio (ACWR) indicates spike in load");
    } else if (twin.performance.acwr < 0.8) {
      factors.push("ACWR indicates detraining risk");
    }
  } else {
    missing.push("acwr");
    confidence = "medium";
  }

  // Check Physical (Asymmetry)
  if (twin.physical?.leftRightAsymmetryPct) {
    if (twin.physical.leftRightAsymmetryPct > 15) {
      riskScore += 2;
      factors.push(`Significant left/right asymmetry detected (${twin.physical.leftRightAsymmetryPct}%)`);
    }
  } else {
    missing.push("leftRightAsymmetryPct");
    if (confidence === "medium") confidence = "low";
  }

  let riskLevel: InjuryRiskResult["riskLevel"] = "low";
  let loadReductionRecommended = false;
  let humanReview = false;

  if (riskScore >= 4) {
    riskLevel = "high";
    loadReductionRecommended = true;
    humanReview = true;
  } else if (riskScore >= 2) {
    riskLevel = "elevated";
    loadReductionRecommended = true;
  }

  return {
    result: {
      riskLevel,
      flags: factors,
      loadReductionRecommended,
    },
    confidence,
    contributingFactors: factors,
    dataRecency: "current",
    missingData: missing,
    humanReviewRecommended: humanReview,
    generatedAt: new Date().toISOString(),
  };
}
