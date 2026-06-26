import type { DailyTaskPriority } from "@/types/athleteiq-daily-plan";

export type AthleteIqDayEntryType = "sleep" | "school" | "training" | "match" | "recovery" | "travel" | "personal" | "task";
export type AthleteIqDayEntryVisibility = "private" | "support_team" | "coach" | "shared";
export type AthleteIqDayEntrySource = "manual" | "daily_plan" | "session";

export type AthleteIqDayEntry = {
  id: string;
  athleteId: string;
  localDate: string;
  type: AthleteIqDayEntryType;
  startAt?: string;
  endAt?: string;
  titleKeyOrText: string;
  visibility: AthleteIqDayEntryVisibility;
  source: AthleteIqDayEntrySource;
  linkedPlanTaskId?: string;
  linkedSessionId?: string;
  priority?: DailyTaskPriority;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  auditHistory: string[];
};

export type AthleteIqDayConflict = {
  entryIds: string[];
  code: "overlap" | "insufficient_recovery";
  messageKey: string;
};

export type AthleteIqDayWindow = {
  startAt: string;
  endAt: string;
  minutes: number;
  sourceEntryIds: string[];
};

export type AthleteIqDayContext = {
  athleteId: string;
  localDate: string;
  timezone: string;
  entries: AthleteIqDayEntry[];
  unscheduledEntries: AthleteIqDayEntry[];
  loadWindows: AthleteIqDayWindow[];
  recoveryWindows: AthleteIqDayWindow[];
  conflicts: AthleteIqDayConflict[];
  dataUsed: string[];
  missingData: string[];
  generatedAt: string;
  version: string;
};
