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
// Minimum prior HRV readings required before trusting a personal baseline.
const HRV_BASELINE_MIN_SAMPLES = 5;
// Today's HRV more than 10% below the athlete's own recent average is treated
// as a recovery signal (a commonly used HRV-drop heuristic in the literature).
const HRV_BELOW_BASELINE_RATIO = 0.9;

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

  // HRV has no fixed absolute threshold (that varies too much per athlete to be
  // reliable) — but the twin's own recorded history gives us each athlete's
  // personal baseline, so once enough prior readings exist we can compare
  // today's HRV against the athlete's own trend rather than fabricating a
  // population threshold (P3 #528, "individual HRV percentile").
  let hrvPresent = false;
  if (typeof twin.physical?.hrvRmssdMs === "number") {
    presentSignals++;
    hrvPresent = true;
    factors.push("HRV available (wearable)");

    const current = twin.physical.hrvRmssdMs;
    const priorHrvReadings = (twin.history ?? [])
      .filter((entry) => entry.dimension === "physical" && typeof entry.snapshot.hrvRmssdMs === "number")
      .map((entry) => entry.snapshot.hrvRmssdMs as number)
      .filter((value) => value !== current);
    if (priorHrvReadings.length >= HRV_BASELINE_MIN_SAMPLES) {
      const baseline = priorHrvReadings.reduce((sum, value) => sum + value, 0) / priorHrvReadings.length;
      if (baseline > 0 && current < baseline * HRV_BELOW_BASELINE_RATIO) {
        score -= 15;
        factors.push("HRV below individual baseline");
      }
    }
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
