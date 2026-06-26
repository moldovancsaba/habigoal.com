import type { PainTrainingIntensity } from "@/types/athleteiq-pain-safety";

export type DailyPlanStatus = "active" | "stale" | "superseded";
export type DailyTaskCategory = "safety" | "mental" | "habit" | "setup" | "coach";
export type DailyTaskCompletionState = "open" | "completed" | "dismissed";
export type DailyTaskPriority = "critical" | "high" | "medium" | "low";

export type DailyTask = {
  id: string;
  category: DailyTaskCategory;
  titleKey: string;
  descriptionKey: string;
  priority: DailyTaskPriority;
  sourceReasonCodes: string[];
  dueWindow: "morning" | "training" | "evening" | "anytime";
  completionState: DailyTaskCompletionState;
};

export type SessionRecommendation = {
  intensity: PainTrainingIntensity | "high";
  type: "recovery" | "controlled" | "standard" | "high_intensity";
  durationRange: string;
  rationale: string[];
  blockedByPainGuardrail: boolean;
};

export type DailyPlan = {
  id?: string;
  athleteId: string;
  localDate: string;
  timezone: string;
  status: DailyPlanStatus;
  tasks: DailyTask[];
  recommendation: SessionRecommendation;
  dataUsed: string[];
  missingData: string[];
  generatedAt: string;
  updatedAt: string;
  version: string;
  auditHistory: string[];
};
