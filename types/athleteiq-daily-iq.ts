import type { AppRole } from "@/lib/access";
import type { AthleteIqCheckInMode, AthleteIqCheckInSnapshot } from "@/types/athleteiq-check-in";
import type { HabitRecord } from "@/types/habit-record";
import type { TrainingLoadRecord } from "@/types/training-load";

export type DailyIqScoreConfidence = "high" | "medium" | "low" | "insufficient";
export type DailyIqPainRiskLevel = "none" | "low" | "moderate" | "high";
export type DailyIqComponentKey = "wellnessReadiness" | "mentalEdge" | "loadFit" | "habitConsistency" | "recoverySupport";
export type DailyIqDataSourceKey = "checkIn" | "habits" | "sessionLoad" | "recoverySupport" | "moduleRegistry";

export type DailyIqInput = {
  athleteId: string;
  localDate: string;
  timezone: string;
  mode: AthleteIqCheckInMode;
  checkInSnapshot: AthleteIqCheckInSnapshot | null;
  habitRecord: HabitRecord | null;
  trainingLoadRecords: TrainingLoadRecord[];
  moduleRegistryVersion: string;
};

export type DailyIqSnapshot = {
  id?: string;
  calculationId: string;
  athleteId: string;
  localDate: string;
  timezone: string;
  mode: AthleteIqCheckInMode;
  checkInSnapshotId?: string;
  dailyIqScore: number | null;
  readinessScore: number | null;
  mentalEdgeScore: number | null;
  habitScore: number | null;
  safeLoadScore: number | null;
  recoverySupportScore: number | null;
  painRiskLevel: DailyIqPainRiskLevel;
  confidence: DailyIqScoreConfidence;
  dataUsed: DailyIqDataSourceKey[];
  missingData: DailyIqDataSourceKey[];
  explanation: string[];
  algorithmVersion: string;
  moduleRegistryVersion: string;
  componentWeights: Record<DailyIqComponentKey, number>;
  painCapApplied: number | null;
  highIntensityBlocked: boolean;
  createdAt: string;
};

export type DailyIqPublicSnapshot = Omit<DailyIqSnapshot, "mentalEdgeScore" | "painRiskLevel" | "explanation"> & {
  mentalEdgeScore: number | null;
  painRiskLevel: DailyIqPainRiskLevel | "redacted";
  explanation: string[];
  redactions: string[];
};

export type DailyIqRecalculateRequest = {
  athleteId?: string;
  localDate?: string;
  timezone?: string;
  mode?: AthleteIqCheckInMode;
};

export type DailyIqSourceBundle = {
  athleteId: string;
  localDate: string;
  timezone: string;
  mode: AthleteIqCheckInMode;
  checkInSnapshot: AthleteIqCheckInSnapshot | null;
  habitRecord: HabitRecord | null;
  trainingLoadRecords: TrainingLoadRecord[];
};

export type DailyIqProjectionContext = {
  role: AppRole;
};
