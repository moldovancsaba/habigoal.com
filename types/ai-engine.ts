import { AthleteTwin } from "./athlete-twin";
import { FmsScreen } from "./athleteiq-fms";

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
  // Latest Functional Movement Screen for the athlete, when available. Optional
  // so callers that don't supply it keep prior behaviour (FMS marked missing).
  latestFms?: FmsScreen | null;
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
