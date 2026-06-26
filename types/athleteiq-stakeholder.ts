import type { DailyIqScoreConfidence } from "@/types/athleteiq-daily-iq";
import type { PainRiskLevel } from "@/types/athleteiq-pain-safety";
import type { MentalEdgeRiskLevel } from "@/types/athleteiq-mental-edge";

export type StakeholderView = "coach" | "parent" | "team";
export type StakeholderAlertType = "pain" | "mental" | "readiness" | "incomplete";
export type StakeholderAlertSeverity = "info" | "watch" | "critical";
export type StakeholderActionState = "acknowledged" | "applied" | "resolved" | "ignored";

export type StakeholderAlert = {
  id: string;
  athleteId: string;
  type: StakeholderAlertType;
  severity: StakeholderAlertSeverity;
  reasonCodes: string[];
  recommendedActionKey: string;
  sourceLabels: string[];
  redactedFields: string[];
};

export type StakeholderAthleteCard = {
  athleteId: string;
  name: string | null;
  readinessScore: number | null;
  readinessBucket: "green" | "yellow" | "red" | "incomplete";
  confidence: DailyIqScoreConfidence | "missing";
  painRiskLevel: PainRiskLevel | "redacted" | "missing";
  mentalRiskLevel: MentalEdgeRiskLevel | "redacted" | "missing";
  sourceLabels: string[];
  missingData: string[];
  redactedFields: string[];
};

export type CoachProjection = {
  view: "coach";
  teamId: string;
  localDate: string;
  alerts: StakeholderAlert[];
  athleteCards: StakeholderAthleteCard[];
  actionQueue: StakeholderAlert[];
  teamTrends: TeamProjection;
  sourceLabels: string[];
  redactions: string[];
  generatedAt: string;
  version: string;
};

export type ParentProjection = {
  view: "parent";
  athleteId: string;
  localDate: string;
  dailySummary: string;
  completedTasks: number;
  safeNotes: string[];
  nextSupportAction: string;
  sourceLabels: string[];
  redactions: string[];
  generatedAt: string;
  version: string;
};

export type TeamProjection = {
  view: "team";
  teamId: string;
  localDate: string;
  athleteCount: number;
  readinessDistribution: {
    green: number;
    yellow: number;
    red: number;
    incomplete: number;
    suppressed: boolean;
  };
  flagsCount: number;
  unavailableCount: number;
  sourceLabels: string[];
  redactions: string[];
  generatedAt: string;
  version: string;
};
