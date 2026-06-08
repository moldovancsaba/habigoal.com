import { AthleteTwin } from "./athlete-twin";

export type ConfidenceLevel = "high" | "medium" | "low";

export interface EngineOutput<T> {
  result: T;
  confidence: ConfidenceLevel;
  contributingFactors: string[];
  dataRecency: "current" | "stale" | "missing";
  missingData: string[];
  humanReviewRecommended: boolean;
  generatedAt: string;
}

export interface EngineContext {
  athleteId: string;
  twin: AthleteTwin;
  organisationId: string;
  // Future expansion: organisation-level thresholds
}

export interface ReadinessResult {
  score: number; // 0-100
  zone: "peak" | "good" | "moderate" | "fatigued" | "recovery";
  clearedForHighIntensity: boolean;
}

export interface RecoveryResult {
  score: number; // 0-100
  status: "recovered" | "partial" | "under_recovered";
  recommendedFocus: "rest" | "active_recovery" | "normal";
}

export interface InjuryRiskResult {
  riskLevel: "low" | "elevated" | "high";
  flags: string[];
  loadReductionRecommended: boolean;
}

export interface RecommendationResult {
  text: string;
  reason: string;
  confidence: ConfidenceLevel;
  humanReviewRequired: boolean;
  advisoryDisclaimer: string;
  modelVersion: string;
}

export interface TechniqueResult {
  movementSymmetryIndex?: number;
  runningFormScore?: number;
  confidence: ConfidenceLevel;
  limitations: string[];
}
