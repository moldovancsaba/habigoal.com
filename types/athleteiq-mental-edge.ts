import type { AthleteIqCheckInSnapshot } from "@/types/athleteiq-check-in";

export type MentalEdgeSignal = "mood" | "stress" | "motivation" | "confidence" | "focus" | "reflectionTone";
export type MentalEdgeRiskLevel = "stable" | "watch" | "concern" | "urgent" | "insufficient";
export type MentalEdgeTrend = "improving" | "steady" | "declining" | "unknown";
export type MentalEdgeRoutineId = "breathing-reset" | "confidence-note" | "recovery-reflection" | "coach-check-in";
export type MentalEdgeAlertSeverity = "moderate" | "high";

export type MentalEdgeRoutine = {
  routineId: MentalEdgeRoutineId;
  labelKey: string;
  reasonCode: string;
  estimatedMinutes: number;
  completed: boolean;
};

export type MentalEdgeSnapshot = {
  athleteId: string;
  localDate: string;
  timezone: string;
  score: number | null;
  riskLevel: MentalEdgeRiskLevel;
  trend: MentalEdgeTrend;
  routines: MentalEdgeRoutine[];
  alertCandidate: CoachMentalAlert | null;
  privateFieldsExcluded: string[];
  dataUsed: string[];
  missingData: MentalEdgeSignal[];
  sourceLabels: Partial<Record<MentalEdgeSignal, string>>;
  algorithmVersion: string;
  checkInSnapshotId?: string;
  generatedAt: string;
};

export type CoachMentalAlert = {
  athleteId: string;
  localDate: string;
  severity: MentalEdgeAlertSeverity;
  reasonCodes: string[];
  recommendedCoachAction: string;
  visibleSourceLabels: string[];
  score: number | null;
  trend: MentalEdgeTrend;
  privateFieldsExcluded: string[];
};

export type MentalEdgeRoutineCompletion = {
  id?: string;
  athleteId: string;
  routineId: MentalEdgeRoutineId;
  localDate: string;
  completedAt: string;
  actorEmail: string;
};

export type MentalEdgeEvaluationInput = {
  athleteId: string;
  localDate: string;
  timezone: string;
  today: AthleteIqCheckInSnapshot | null;
  recent: AthleteIqCheckInSnapshot[];
  completedRoutineIds: MentalEdgeRoutineId[];
};
