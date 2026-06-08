import { EngineContext, EngineOutput, RecoveryResult } from "../../types/ai-engine";

export async function computeRecovery(context: EngineContext): Promise<EngineOutput<RecoveryResult>> {
  const { twin } = context;
  const factors: string[] = [];
  const missing: string[] = [];
  let score = 100;
  let confidence: "high" | "medium" | "low" = "high";
  let humanReview = false;

  // Check Cognitive / Subjective Dimension
  if (twin.cognitive?.stressTrend7d) {
    if (twin.cognitive.stressTrend7d > 7) {
      score -= 20;
      factors.push("High stress trend detected");
    }
  } else {
    missing.push("stressTrend7d");
    confidence = "medium";
  }

  // Check Recovery Dimension (Soreness)
  if (twin.recovery?.sorenessScore7d) {
    if (twin.recovery.sorenessScore7d > 6) {
      score -= 25;
      factors.push("Elevated soreness score");
    }
  } else {
    missing.push("sorenessScore7d");
    if (confidence === "medium") confidence = "low";
    else confidence = "medium";
  }

  let status: RecoveryResult["status"] = "recovered";
  let recommendedFocus: RecoveryResult["recommendedFocus"] = "normal";

  if (score < 50) {
    status = "under_recovered";
    recommendedFocus = "rest";
    humanReview = true;
  } else if (score < 80) {
    status = "partial";
    recommendedFocus = "active_recovery";
  }

  return {
    result: {
      score,
      status,
      recommendedFocus,
    },
    confidence,
    contributingFactors: factors,
    dataRecency: "current",
    missingData: missing,
    humanReviewRecommended: humanReview,
    generatedAt: new Date().toISOString(),
  };
}
