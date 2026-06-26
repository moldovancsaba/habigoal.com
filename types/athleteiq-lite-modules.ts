import type { AthleteIqModuleClaimBoundary, AthleteIqModuleMaturity } from "@/lib/athleteiq-modules";

export type LiteModuleKey = "recovery_lite" | "fuel_lite" | "learning_lite" | "wearable_manual_sync";
export type LiteModuleStatus = "manual_available" | "content_available" | "planned_integration";
export type LiteModuleSource = "manual";
export type LiteModuleEntryKind = "recovery" | "fuel" | "learning" | "manual_wearable";
export type LiteModuleConfidence = "medium" | "low" | "insufficient";
export type FuelStatus = "on_track" | "late" | "missed" | "unknown";
export type LearningProgressStatus = "not_started" | "in_progress" | "completed" | "skipped";
export type ManualWearableMetricKey = "resting_heart_rate" | "hrv_ms" | "sleep_hours" | "steps" | "body_weight_kg" | "training_load_au";

export type LiteModuleGatewayCapability = {
  moduleKey: LiteModuleKey;
  displayNameKey: string;
  summaryKey: string;
  status: LiteModuleStatus;
  maturity: AthleteIqModuleMaturity;
  claimBoundary: AthleteIqModuleClaimBoundary;
  source: LiteModuleSource;
  sourceLabelKey: string;
  dataUsed: string[];
  missingData: string[];
  plannedIntegrationLabelKey?: string;
  routes: string[];
};

export type LiteModuleBaseEntry = {
  id: string;
  athleteId: string;
  localDate: string;
  timezone: string;
  moduleKey: LiteModuleKey;
  entryKind: LiteModuleEntryKind;
  source: LiteModuleSource;
  sourceLabelKey: string;
  claimBoundary: AthleteIqModuleClaimBoundary;
  moduleStatus: LiteModuleStatus;
  idempotencyKey?: string;
  actorEmail: string;
  createdAt: string;
  updatedAt: string;
  dataUsed: string[];
  missingData: string[];
  validationWarnings: string[];
  auditHistory: string[];
};

export type RecoveryLiteEntry = LiteModuleBaseEntry & {
  moduleKey: "recovery_lite";
  entryKind: "recovery";
  protocolKey: string;
  completedAt: string;
  perceivedRecovery: number;
};

export type FuelGuidanceEntry = LiteModuleBaseEntry & {
  moduleKey: "fuel_lite";
  entryKind: "fuel";
  mealTimingStatus: FuelStatus;
  hydrationStatus: FuelStatus;
  note?: string;
};

export type LearningItemProgress = LiteModuleBaseEntry & {
  moduleKey: "learning_lite";
  entryKind: "learning";
  itemId: string;
  status: LearningProgressStatus;
  completedAt?: string;
};

export type ManualWearableEntry = LiteModuleBaseEntry & {
  moduleKey: "wearable_manual_sync";
  entryKind: "manual_wearable";
  metricKey: ManualWearableMetricKey;
  value: number;
  unit: string;
  measuredAt: string;
  integrationStatus: "not_connected_manual_only";
  deviceConnectionClaim: false;
};

export type LiteModuleEntry = RecoveryLiteEntry | FuelGuidanceEntry | LearningItemProgress | ManualWearableEntry;

export type LiteModuleDailySummary = {
  athleteId: string;
  localDate: string;
  moduleKey: LiteModuleKey;
  status: LiteModuleStatus;
  source: LiteModuleSource;
  sourceLabelKey: string;
  claimBoundary: AthleteIqModuleClaimBoundary;
  confidence: LiteModuleConfidence;
  latestEntryAt?: string;
  entryCount: number;
  facts: string[];
  dataUsed: string[];
  missingData: string[];
  validationWarnings: string[];
  planReasonLabels: string[];
  reportEvidenceLabels: string[];
};

export type LiteModuleGatewaySummary = {
  athleteId: string;
  localDate: string;
  summaries: LiteModuleDailySummary[];
  dataUsed: string[];
  missingData: string[];
  generatedAt: string;
  capabilityKey: string;
  version: string;
};
