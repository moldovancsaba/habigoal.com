import type { AppRole } from "@/lib/access";
import type { DailyIqSnapshot } from "@/types/athleteiq-daily-iq";
import type { DailyPlan } from "@/types/athleteiq-daily-plan";
import type { PainGuardrail } from "@/types/athleteiq-pain-safety";
import type { ReadinessRouteSnapshot } from "@/types/athleteiq-readiness-route";
import type { AthleteTwinProjection } from "@/types/athleteiq-twin-projection";
import type { CoachActionRecord } from "@/types/coach-action";

export type DailyEngineSourceEvent = "check_in_submitted" | "manual_recalculate" | "scheduled_rebuild";

export type DailyEngineActor = {
  email: string;
  name: string;
  role: AppRole;
};

export type DailyEngineRunInput = {
  athleteId: string;
  localDate?: string;
  timezone?: string;
  mode?: "lifestyle" | "performance";
  sourceEvent: DailyEngineSourceEvent;
  idempotencyKey?: string;
  actor: DailyEngineActor;
  generateReport?: boolean;
};

export type DailyEnginePartialFailure = {
  step: string;
  message: string;
};

export type DailyEngineRun = {
  runId: string;
  athleteId: string;
  localDate: string;
  timezone: string;
  mode: "lifestyle" | "performance";
  sourceEvent: DailyEngineSourceEvent;
  idempotencyKey?: string;
  dailyIq: DailyIqSnapshot | null;
  painGuardrail: PainGuardrail | null;
  readinessRoute: ReadinessRouteSnapshot | null;
  dailyPlan: DailyPlan | null;
  twinProjections: AthleteTwinProjection[];
  coachActions: CoachActionRecord[];
  partialFailures: DailyEnginePartialFailure[];
  generatedAt: string;
};
