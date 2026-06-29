import { EngineContext, EngineOutput, RecoveryResult } from "../../types/ai-engine";

// ENG-002 (#209): the recovery engine combines **subjective** signals (stress,
// soreness) with **wearable** signals (sleep quality, HRV) into one composite
// score. Each signal contributes only when present; absent signals are tracked
// in `missingData` and lower the confidence, so a wearable-equipped athlete
// yields a higher-confidence recovery read than a subjective-only one. No signal
// is fabricated when missing.

// Sleep quality is on a 0–10 scale (higher is better); below this is "low".
const LOW_SLEEP_THRESHOLD = 5;
const HIGH_STRESS_THRESHOLD = 7;
const HIGH_SORENESS_THRESHOLD = 6;

export async function computeRecovery(context: EngineContext): Promise<EngineOutput<RecoveryResult>> {
  const { twin } = context;
  const factors: string[] = [];
  const missing: string[] = [];
  let score = 100;
  let presentSignals = 0;

  // --- Subjective signals -------------------------------------------------
  if (typeof twin.cognitive?.stressTrend7d === "number") {
    presentSignals++;
    if (twin.cognitive.stressTrend7d > HIGH_STRESS_THRESHOLD) {
      score -= 20;
      factors.push("High stress trend (subjective)");
    }
  } else {
    missing.push("stressTrend7d");
  }

  if (typeof twin.recovery?.sorenessScore7d === "number") {
    presentSignals++;
    if (twin.recovery.sorenessScore7d > HIGH_SORENESS_THRESHOLD) {
      score -= 25;
      factors.push("Elevated soreness score (subjective)");
    }
  } else {
    missing.push("sorenessScore7d");
  }

  // --- Wearable signals ---------------------------------------------------
  if (typeof twin.recovery?.sleepQualityScore7d === "number") {
    presentSignals++;
    if (twin.recovery.sleepQualityScore7d < LOW_SLEEP_THRESHOLD) {
      score -= 15;
      factors.push("Low sleep quality (wearable)");
    }
  } else {
    missing.push("sleepQualityScore7d");
  }

  // HRV has no per-athlete baseline here, so applying an absolute threshold would
  // be unreliable. Instead its presence is treated as a recovery signal that
  // raises confidence (the wearable merge), and its absence is tracked.
  let hrvPresent = false;
  if (typeof twin.physical?.hrvRmssdMs === "number") {
    presentSignals++;
    hrvPresent = true;
    factors.push("HRV available (wearable)");
  } else {
    missing.push("hrvRmssdMs");
  }

  // Confidence scales with how many of the four signals are present, and a
  // wearable signal (sleep or HRV) is required for "high".
  const hasWearable = hrvPresent || typeof twin.recovery?.sleepQualityScore7d === "number";
  let confidence: "high" | "medium" | "low";
  if (presentSignals >= 3 && hasWearable) confidence = "high";
  else if (presentSignals >= 2) confidence = "medium";
  else confidence = "low";

  if (score < 0) score = 0;

  let status: RecoveryResult["status"] = "recovered";
  let recommendedFocus: RecoveryResult["recommendedFocus"] = "normal";
  let humanReview = false;

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
