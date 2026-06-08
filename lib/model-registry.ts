export interface ModelRegistryEntry {
  modelId: string;
  engine: string;
  version: string;
  purpose: string;
  inputs: string[];
  outputs: string[];
  limitations: string[];
  evaluationMetrics: string[];
  owner: string;
  deployedAt: string;
  monitoringPlan: string;
}

export const MODEL_REGISTRY: ModelRegistryEntry[] = [
  {
    modelId: "readiness-v1",
    engine: "readiness",
    version: "1.0.0",
    purpose: "Daily readiness scoring from twin recovery and performance dimensions.",
    inputs: ["recovery.sleepQualityScore7d", "recovery.energyScore7d", "performance.acwr"],
    outputs: ["score", "zone", "clearedForHighIntensity"],
    limitations: ["Requires at least one recovery signal.", "Not a medical clearance tool."],
    evaluationMetrics: ["coach_override_rate", "checkin_completion_correlation"],
    owner: "habigoal-platform",
    deployedAt: "2026-06-08",
    monitoringPlan: "Weekly review of override rate and stale-data flags.",
  },
  {
    modelId: "recovery-v1",
    engine: "recovery",
    version: "1.0.0",
    purpose: "Recovery status from subjective and wearable signals.",
    inputs: ["recovery.*", "physical.hrvRmssdMs", "physical.restingHeartRateBpm"],
    outputs: ["score", "status", "recommendedFocus"],
    limitations: ["Wearable merge depends on device sync quality."],
    evaluationMetrics: ["missing_data_rate", "sync_success_rate"],
    owner: "habigoal-platform",
    deployedAt: "2026-06-08",
    monitoringPlan: "Monitor wearable sync KPI weekly.",
  },
  {
    modelId: "injury-risk-v1",
    engine: "injury_risk",
    version: "1.0.0",
    purpose: "Injury risk indicators for coaching support — not diagnosis.",
    inputs: ["performance.acwr", "recovery.sorenessScore7d", "injuryHistoryFlags"],
    outputs: ["riskLevel", "flags", "loadReductionRecommended"],
    limitations: ["Advisory only. Must not be presented as medical diagnosis."],
    evaluationMetrics: ["human_review_rate", "false_positive_reports"],
    owner: "habigoal-platform",
    deployedAt: "2026-06-08",
    monitoringPlan: "Quarterly language audit and coach feedback review.",
  },
  {
    modelId: "recommendation-v1",
    engine: "recommendation",
    version: "1.0.0",
    purpose: "Human-reviewable coaching recommendations from readiness state.",
    inputs: ["readiness.zone", "recovery.status", "injuryRisk.riskLevel"],
    outputs: ["text", "reason", "confidence", "humanReviewRequired"],
    limitations: ["Advisory only. Requires coach acceptance for action."],
    evaluationMetrics: ["accept_rate", "ignore_rate", "override_rate"],
    owner: "habigoal-platform",
    deployedAt: "2026-06-08",
    monitoringPlan: "Track override audit events monthly.",
  },
  {
    modelId: "technique-v1",
    engine: "technique",
    version: "1.0.0",
    purpose: "Movement quality observations from vision/kinematics inputs.",
    inputs: ["vision.poseLandmarks", "vision.anomalyScore"],
    outputs: ["movementSymmetryIndex", "confidence", "limitations"],
    limitations: ["Poor input quality blocks conclusions.", "Not clinical diagnosis."],
    evaluationMetrics: ["low_confidence_rate", "media_quality_rejection_rate"],
    owner: "habigoal-platform",
    deployedAt: "2026-06-08",
    monitoringPlan: "Review rejected media jobs weekly.",
  },
];

export function getModelRegistry(): ModelRegistryEntry[] {
  return MODEL_REGISTRY;
}

export function getModelByEngine(engine: string): ModelRegistryEntry | undefined {
  return MODEL_REGISTRY.find((m) => m.engine === engine);
}
