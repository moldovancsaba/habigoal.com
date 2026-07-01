import { AthleteTwin } from "../../types/athlete-twin";
import {
  EngineOutput,
  InjuryRiskResult,
  ReadinessResult,
  RecommendationResult,
  RecommendationTextKey,
  RecoveryResult,
} from "../../types/ai-engine";
import { getModelByEngine } from "../model-registry";

const ADVISORY_DISCLAIMER =
  "This is a coaching readiness indicator, not a medical diagnosis. Human review is required for youth athletes and high-risk states.";

function isMinor(birthDate?: string): boolean {
  if (!birthDate) return false;
  const birth = new Date(birthDate);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age < 18;
}

export function buildRecommendation(
  twin: AthleteTwin,
  readiness: EngineOutput<ReadinessResult>,
  recovery: EngineOutput<RecoveryResult>,
  injuryRisk: EngineOutput<InjuryRiskResult>,
  birthDate?: string
): RecommendationResult {
  const zone = readiness.result.zone;
  let text = "";
  // The zone maps 1:1 onto the translation key — the UI renders this instead of
  // `text` so the coach sees the recommendation in their own locale (#recommendation-i18n).
  const textKey: RecommendationTextKey = zone;
  let reason = "";
  let confidence = readiness.confidence;
  let humanReviewRequired =
    readiness.humanReviewRecommended ||
    injuryRisk.humanReviewRecommended ||
    injuryRisk.result.riskLevel === "high";

  if (isMinor(birthDate)) {
    humanReviewRequired = true;
  }

  if (zone === "peak") {
    text = "Proceed with planned high-intensity work. Monitor RPE during maximal efforts.";
    reason = `Readiness zone is ${zone} with score ${readiness.result.score}. Recovery status: ${recovery.result.status}.`;
  } else if (zone === "good") {
    text = "Proceed with the planned session. Monitor load toward the end of the block.";
    reason = `Readiness is good (${readiness.result.score}). Contributing factors: ${readiness.contributingFactors.join(", ") || "stable signals"}.`;
  } else if (zone === "moderate") {
    text = "Reduce volume by 15–20% and avoid maximal eccentric loads today.";
    reason = `Moderate fatigue detected. Recovery: ${recovery.result.status}. Factors: ${readiness.contributingFactors.join(", ") || "elevated load"}.`;
    confidence = "medium";
  } else if (zone === "fatigued") {
    text = "Prioritise active recovery and tactical walkthroughs over physical exertion.";
    reason = `Fatigued state (score ${readiness.result.score}). Stress/load signals elevated.`;
    humanReviewRequired = true;
  } else {
    text = "Mandatory rest day recommended to allow central nervous system recovery.";
    reason = `Compromised readiness (score ${readiness.result.score}). Missing data: ${readiness.missingData.join(", ") || "none"}.`;
    humanReviewRequired = true;
    confidence = "low";
  }

  if (injuryRisk.result.loadReductionRecommended) {
    text += " Load reduction recommended based on injury risk indicators.";
    reason += ` Injury risk: ${injuryRisk.result.riskLevel} (${injuryRisk.result.flags.join(", ") || "load signals"}).`;
    humanReviewRequired = true;
  }

  return {
    text,
    textKey,
    reason,
    confidence,
    humanReviewRequired,
    delivery: humanReviewRequired ? "awaiting_review" : "direct",
    advisoryDisclaimer: ADVISORY_DISCLAIMER,
    modelVersion: getModelByEngine("recommendation")?.version ?? "1.0.0",
  };
}

/** @deprecated Use buildRecommendation for structured output */
export function generateCoachingRecommendation(twin: AthleteTwin, readiness: ReadinessResult): string {
  return buildRecommendation(
    twin,
    {
      result: readiness,
      confidence: "medium",
      contributingFactors: [],
      dataRecency: "current",
      missingData: [],
      humanReviewRecommended: readiness.zone === "recovery",
      generatedAt: new Date().toISOString(),
    },
    {
      result: { score: 70, status: "partial", recommendedFocus: "normal" },
      confidence: "medium",
      contributingFactors: [],
      dataRecency: "current",
      missingData: [],
      humanReviewRecommended: false,
      generatedAt: new Date().toISOString(),
    },
    {
      result: { riskLevel: "low", flags: [], loadReductionRecommended: false },
      confidence: "medium",
      contributingFactors: [],
      dataRecency: "current",
      missingData: [],
      humanReviewRecommended: false,
      generatedAt: new Date().toISOString(),
    }
  ).text;
}
