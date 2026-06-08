import { EngineContext, EngineOutput, ReadinessResult } from "../../types/ai-engine";

export async function computeReadiness(context: EngineContext): Promise<EngineOutput<ReadinessResult>> {
  const { twin } = context;
  const factors: string[] = [];
  const missing: string[] = [];
  let score = 100;
  let confidence: "high" | "medium" | "low" = "high";
  let humanReview = false;

  // Check Physical Dimension
  if (twin.physical?.restingHeartRateBpm) {
    // Mock logic: elevated resting HR lowers readiness
    if (twin.physical.restingHeartRateBpm > 65) {
      score -= 10;
      factors.push("Elevated resting heart rate");
    }
  } else {
    missing.push("restingHeartRateBpm");
    confidence = "medium";
  }

  // Check Recovery Dimension (Sleep)
  if (twin.recovery?.sleepQualityScore7d) {
    if (twin.recovery.sleepQualityScore7d < 60) {
      score -= 15;
      factors.push("Poor 7-day sleep trend");
    }
  } else {
    missing.push("sleepQualityScore7d");
    confidence = "low";
  }

  // Determine Zone
  let zone: ReadinessResult["zone"] = "peak";
  if (score >= 85) zone = "peak";
  else if (score >= 70) zone = "good";
  else if (score >= 55) zone = "moderate";
  else if (score >= 40) zone = "fatigued";
  else {
    zone = "recovery";
    humanReview = true;
  }

  const clearedForHighIntensity = score >= 70;
  if (!clearedForHighIntensity) {
    factors.push("Not cleared for high-intensity training");
  }

  return {
    result: {
      score,
      zone,
      clearedForHighIntensity,
    },
    confidence,
    contributingFactors: factors,
    dataRecency: "current", // Simplify for MVP
    missingData: missing,
    humanReviewRecommended: humanReview,
    generatedAt: new Date().toISOString(),
  };
}
