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
    if (twin.recovery.sleepQualityScore7d < 40) {
      score -= 10;
      factors.push("Severe 7-day sleep deficit");
    }
  } else {
    missing.push("sleepQualityScore7d");
    confidence = "low";
  }

  // Present-only refinements (P3 #528). These deepen the read when richer twin
  // signals exist WITHOUT changing the two-signal confidence contract: absent
  // extras are not counted against confidence, they only sharpen the score when
  // present. No fabrication — every penalty maps to a recorded twin value.
  const stress = twin.recovery?.stressScore7d;
  if (typeof stress === "number" && stress > 7) {
    score -= 10;
    factors.push("Elevated 7-day stress load");
  }
  const soreness = twin.recovery?.sorenessScore7d;
  if (typeof soreness === "number" && soreness > 6) {
    score -= 10;
    factors.push("High 7-day soreness");
  }
  const energy = twin.recovery?.energyScore7d;
  if (typeof energy === "number" && energy < 4) {
    score -= 10;
    factors.push("Low 7-day energy");
  }
  // Training-load context: an acute:chronic workload spike suppresses readiness.
  const acwr = twin.performance?.acwr;
  if (typeof acwr === "number" && acwr > 1.5) {
    score -= 10;
    factors.push("Acute training-load spike (ACWR)");
  }

  score = Math.max(0, Math.min(100, score));

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
