import { EngineContext, EngineOutput, InjuryRiskResult } from "../../types/ai-engine";
import { FMS_COMPOSITE_MAX, FMS_RISK_COMPOSITE_THRESHOLD, hasAnyPainFlag } from "../athleteiq-fms";

export async function computeInjuryRisk(context: EngineContext): Promise<EngineOutput<InjuryRiskResult>> {
  const { twin, latestFms } = context;
  const factors: string[] = [];
  const missing: string[] = [];
  let confidence: "high" | "medium" | "low" = "high";
  let humanReviewFromInputs = false;

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

  // Check Functional Movement Screen (composite + pain). A composite at/below
  // the established FMS cutoff (14/21) is an elevated-risk signal; any recorded
  // pain flag adds risk and warrants human review.
  if (latestFms) {
    if (latestFms.composite <= FMS_RISK_COMPOSITE_THRESHOLD) {
      riskScore += 2;
      factors.push(`FMS composite below threshold (${latestFms.composite}/${FMS_COMPOSITE_MAX})`);
    }
    if (hasAnyPainFlag(latestFms.painFlags)) {
      riskScore += 2;
      humanReviewFromInputs = true;
      factors.push("FMS pain flag recorded on a movement sub-test");
    }
  } else {
    missing.push("fms");
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

  if (humanReviewFromInputs) humanReview = true;

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
