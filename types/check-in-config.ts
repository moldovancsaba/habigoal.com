import type { DailyTrackerQuestionKey } from "@/lib/readiness-model";

export interface CheckInQuestionConfig {
  key: DailyTrackerQuestionKey | string;
  enabled: boolean;
  required: boolean;
  labelKey?: string;
  canonicalKey?: string;
  concernThreshold?: number;
}

export interface CheckInOrgConfig {
  organisationId: string;
  questions: CheckInQuestionConfig[];
  allowDuplicateOverride: boolean;
  updatedAt: string;
}
