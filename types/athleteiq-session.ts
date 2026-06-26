import type { DailyPlan } from "@/types/athleteiq-daily-plan";
import type { PainGuardrail } from "@/types/athleteiq-pain-safety";

export type AthleteIqSessionState = "draft" | "active" | "paused" | "completed" | "abandoned";
export type AthleteIqSessionBlockType = "warmup" | "main" | "cooldown" | "recovery";

export type AthleteIqSessionBlock = {
  type: AthleteIqSessionBlockType;
  durationMinutes: number;
  intensity: DailyPlan["recommendation"]["intensity"];
  instructionsKey: string;
  safetyNotesKey: string;
};

export type AthleteIqSessionLog = {
  sessionId: string;
  athleteId: string;
  startedAt?: string;
  completedAt?: string;
  rpe?: number;
  completionPct?: number;
  painAfter?: number;
  moodAfter?: number;
  notes?: string;
  sourcePlanId?: string;
  estimatedLoadPoints: number;
};

export type AthleteIqSession = {
  id?: string;
  sessionId: string;
  athleteId: string;
  localDate: string;
  state: AthleteIqSessionState;
  blocks: AthleteIqSessionBlock[];
  sourcePlanId?: string;
  recommendation: DailyPlan["recommendation"];
  painGuardrail: Pick<PainGuardrail, "state" | "maxTrainingIntensity" | "dailyIqCap" | "reasonCodes">;
  log: AthleteIqSessionLog;
  auditHistory: string[];
  createdAt: string;
  updatedAt: string;
};
