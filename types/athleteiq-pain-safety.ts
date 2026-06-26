export type PainAlertState = "none" | "monitor" | "capped" | "coach_review" | "resolved" | "dismissed";
export type PainRiskLevel = "none" | "low" | "moderate" | "high" | "recurring";
export type PainTrainingIntensity = "normal" | "moderate" | "low" | "recovery";

export type PainSignal = {
  painScore: number | null;
  locations: string[];
  duration: string | null;
  recurrenceWindowDays: number;
  sessionLoadContext: number | null;
};

export type PainGuardrail = {
  athleteId: string;
  localDate: string;
  state: PainAlertState;
  riskLevel: PainRiskLevel;
  maxTrainingIntensity: PainTrainingIntensity;
  dailyIqCap: number | null;
  requiredCopyKey: string;
  coachAlertId?: string;
  reasonCodes: string[];
  dataUsed: string[];
  missingData: string[];
  generatedAt: string;
};

export type PainAlertRecord = {
  id?: string;
  athleteId: string;
  localDate: string;
  state: PainAlertState;
  riskLevel: PainRiskLevel;
  painScore: number | null;
  locations: string[];
  reasonCodes: string[];
  requiredCopyKey: string;
  statusUpdatedBy?: string;
  statusNote?: string;
  auditHistory: string[];
  createdAt: string;
  updatedAt: string;
};

export type PainSafetyEvaluationInput = {
  athleteId: string;
  localDate: string;
  recentPainScores: Array<{ localDate: string; painScore: number | null; locations: string[]; sessionLoadContext: number | null }>;
  existingAlertId?: string;
};
