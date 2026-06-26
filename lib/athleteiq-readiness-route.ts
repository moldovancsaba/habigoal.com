import { ATHLETEIQ_MODULE_REGISTRY_VERSION } from "@/lib/athleteiq-modules";
import type { DailyIqSnapshot } from "@/types/athleteiq-daily-iq";
import type { PainGuardrail } from "@/types/athleteiq-pain-safety";
import type { AppliedRouteRule, ReadinessRoute, ReadinessRouteRequest, ReadinessRouteSnapshot, RouteRule } from "@/types/athleteiq-readiness-route";

export const ATHLETEIQ_READINESS_ROUTE_CAPABILITY_KEY = "AIQ-1245";
export const ATHLETEIQ_READINESS_ROUTE_VERSION = "aiq-readiness-route-1245.1";

const greenRule: RouteRule = {
  inputSignal: "readinessScore",
  threshold: 70,
  operator: ">=",
  outputRoute: "green",
  explanationKey: "athleteiq.readinessRoute.rules.greenReadiness",
  severity: "info"
};

const amberRule: RouteRule = {
  inputSignal: "readinessScore",
  threshold: 45,
  operator: ">=",
  outputRoute: "amber",
  explanationKey: "athleteiq.readinessRoute.rules.amberReadiness",
  severity: "warning"
};

const redLowReadinessRule: RouteRule = {
  inputSignal: "readinessScore",
  threshold: 45,
  operator: "<",
  outputRoute: "red",
  explanationKey: "athleteiq.readinessRoute.rules.redLowReadiness",
  severity: "critical"
};

const highPainRule: RouteRule = {
  inputSignal: "painGuardrail",
  threshold: "capped_or_coach_review",
  operator: "=",
  outputRoute: "red",
  explanationKey: "athleteiq.readinessRoute.rules.highPainOverride",
  severity: "critical"
};

const lowConfidenceRule: RouteRule = {
  inputSignal: "confidence",
  threshold: "low_or_insufficient",
  operator: "=",
  outputRoute: "amber",
  explanationKey: "athleteiq.readinessRoute.rules.lowConfidence",
  severity: "warning"
};

export function validateReadinessRouteRequest(input: ReadinessRouteRequest) {
  const errors: string[] = [];
  if (!input.athleteId?.trim()) errors.push("athleteId is required");
  if (input.localDate && !/^\d{4}-\d{2}-\d{2}$/.test(input.localDate)) errors.push("localDate must use YYYY-MM-DD");
  return errors;
}

export function buildReadinessRouteSnapshot(input: {
  athleteId: string;
  localDate: string;
  timezone: string;
  dailyIq: DailyIqSnapshot | null;
  painGuardrail: PainGuardrail | null;
  previousSnapshot?: ReadinessRouteSnapshot | null;
}, now = new Date()): ReadinessRouteSnapshot {
  const rulesUsed = getAppliedRules(input.dailyIq, input.painGuardrail);
  const route = strongestRoute(rulesUsed);
  const capsApplied = [
    ...(input.dailyIq?.painCapApplied !== null && input.dailyIq?.painCapApplied !== undefined ? [`daily_iq_cap:${input.dailyIq.painCapApplied}`] : []),
    ...(input.dailyIq?.highIntensityBlocked ? ["high_intensity_blocked"] : []),
    ...(input.painGuardrail?.dailyIqCap ? [`pain_guardrail_cap:${input.painGuardrail.dailyIqCap}`] : []),
    ...(input.painGuardrail?.maxTrainingIntensity === "recovery" ? ["recovery_only"] : [])
  ];
  const timestamp = now.toISOString();

  return {
    athleteId: input.athleteId,
    localDate: input.localDate,
    timezone: input.timezone,
    route,
    action: actionForRoute(route),
    readinessScore: input.dailyIq?.readinessScore ?? null,
    dailyIqScore: input.dailyIq?.dailyIqScore ?? null,
    confidence: input.dailyIq?.confidence ?? "insufficient",
    rulesUsed,
    capsApplied,
    allowedActions: allowedActionsForRoute(route),
    blockedActions: blockedActionsForRoute(route),
    dataUsed: Array.from(new Set([
      ...(input.dailyIq ? ["daily_iq"] : []),
      ...(input.painGuardrail ? ["pain_guardrail"] : []),
      ATHLETEIQ_MODULE_REGISTRY_VERSION
    ])),
    missingData: Array.from(new Set([
      ...(!input.dailyIq ? ["daily_iq"] : []),
      ...(!input.painGuardrail ? ["pain_guardrail"] : []),
      ...(input.dailyIq?.missingData ?? []),
      ...(input.painGuardrail?.missingData ?? [])
    ])),
    moduleMaturity: "active",
    claimBoundary: "backed_by_user_input",
    algorithmVersion: ATHLETEIQ_READINESS_ROUTE_VERSION,
    generatedAt: timestamp,
    auditHistory: [...(input.previousSnapshot?.auditHistory ?? []), `calculated:${timestamp}`]
  };
}

function getAppliedRules(dailyIq: DailyIqSnapshot | null, painGuardrail: PainGuardrail | null): AppliedRouteRule[] {
  const rules: AppliedRouteRule[] = [];
  if (!dailyIq) {
    rules.push({ ...lowConfidenceRule, actualValue: "missing_daily_iq" });
    return rules;
  }

  if (painGuardrail && (painGuardrail.state === "capped" || painGuardrail.state === "coach_review" || painGuardrail.riskLevel === "high" || painGuardrail.riskLevel === "recurring")) {
    rules.push({ ...highPainRule, actualValue: painGuardrail.state });
  }

  if (dailyIq.confidence === "low" || dailyIq.confidence === "insufficient") {
    rules.push({ ...lowConfidenceRule, actualValue: dailyIq.confidence });
  }

  const readinessScore = dailyIq.readinessScore;
  if (readinessScore === null) {
    rules.push({ ...lowConfidenceRule, actualValue: "missing_readiness" });
  } else if (readinessScore < 45) {
    rules.push({ ...redLowReadinessRule, actualValue: readinessScore });
  } else if (readinessScore >= 70 && dailyIq.confidence !== "low" && dailyIq.confidence !== "insufficient" && !dailyIq.highIntensityBlocked) {
    rules.push({ ...greenRule, actualValue: readinessScore });
  } else {
    rules.push({ ...amberRule, actualValue: readinessScore });
  }

  return rules;
}

function strongestRoute(rules: AppliedRouteRule[]): ReadinessRoute {
  if (rules.some((rule) => rule.outputRoute === "red")) return "red";
  if (rules.some((rule) => rule.outputRoute === "amber")) return "amber";
  return "green";
}

function actionForRoute(route: ReadinessRoute) {
  if (route === "green") return "full_training_allowed";
  if (route === "amber") return "controlled_training_only";
  return "recovery_or_coach_review";
}

function allowedActionsForRoute(route: ReadinessRoute) {
  if (route === "green") return ["standard_training", "high_intensity_if_planned", "normal_habit_work"];
  if (route === "amber") return ["controlled_training", "recovery_protocol", "coach_check_optional"];
  return ["recovery_protocol", "coach_or_physio_review", "pain_safety_followup"];
}

function blockedActionsForRoute(route: ReadinessRoute) {
  if (route === "green") return [];
  if (route === "amber") return ["unplanned_high_intensity"];
  return ["high_intensity", "max_load_session", "return_to_play_claim"];
}
