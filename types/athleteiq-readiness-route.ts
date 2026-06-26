import type { DailyIqScoreConfidence } from "@/types/athleteiq-daily-iq";

export type ReadinessRoute = "green" | "amber" | "red";
export type ReadinessRouteSeverity = "info" | "warning" | "critical";
export type ReadinessRouteAction = "full_training_allowed" | "controlled_training_only" | "recovery_or_coach_review";

export type RouteRule = {
  inputSignal: string;
  threshold: number | string;
  operator: ">=" | "<" | "=" | "missing" | "present";
  outputRoute: ReadinessRoute;
  explanationKey: string;
  severity: ReadinessRouteSeverity;
};

export type AppliedRouteRule = RouteRule & {
  actualValue: number | string | null;
};

export type ReadinessRouteSnapshot = {
  id?: string;
  athleteId: string;
  localDate: string;
  timezone: string;
  route: ReadinessRoute;
  action: ReadinessRouteAction;
  readinessScore: number | null;
  dailyIqScore: number | null;
  confidence: DailyIqScoreConfidence;
  rulesUsed: AppliedRouteRule[];
  capsApplied: string[];
  allowedActions: string[];
  blockedActions: string[];
  dataUsed: string[];
  missingData: string[];
  moduleMaturity: "active";
  claimBoundary: "backed_by_user_input";
  algorithmVersion: string;
  generatedAt: string;
  auditHistory: string[];
};

export type ReadinessRouteRequest = {
  athleteId?: string;
  localDate?: string;
  timezone?: string;
};
