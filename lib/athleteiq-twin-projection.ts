import type { AppRole } from "@/lib/access";
import { ATHLETEIQ_MODULE_REGISTRY, ATHLETEIQ_MODULE_REGISTRY_VERSION } from "@/lib/athleteiq-modules";
import type { ChildProfile } from "@/repositories/child.repository";
import type { DailyIqSnapshot } from "@/types/athleteiq-daily-iq";
import type { DailyPlan } from "@/types/athleteiq-daily-plan";
import type { MentalEdgeSnapshot } from "@/types/athleteiq-mental-edge";
import type { PainGuardrail } from "@/types/athleteiq-pain-safety";
import type { HabitRecord } from "@/types/habit-record";
import type { AthleteTwinProjection, AthleteTwinProjectionView, ProfileDimension, ProfileSourceConfidence } from "@/types/athleteiq-twin-projection";

export const ATHLETEIQ_TWIN_PROJECTION_CAPABILITY_KEY = "AIQ-1260";
export const ATHLETEIQ_TWIN_PROJECTION_VERSION = "aiq-twin-projection-1260.1";

export function isAthleteTwinProjectionView(value: unknown): value is AthleteTwinProjectionView {
  return value === "athlete" || value === "coach" || value === "parent" || value === "team";
}

export function buildAthleteTwinProjection(input: {
  athleteId: string;
  athlete: ChildProfile | null;
  view: AthleteTwinProjectionView;
  viewerRole: AppRole;
  dailyIq: DailyIqSnapshot | null;
  mentalEdge: MentalEdgeSnapshot | null;
  painGuardrail: PainGuardrail | null;
  habitRecord: HabitRecord | null;
  dailyPlan: DailyPlan | null;
}, now = new Date()): AthleteTwinProjection {
  const updatedAt = now.toISOString();
  const parentRedaction = input.view === "parent" || input.viewerRole === "parent";
  const activeDimensions = [
    buildReadinessDimension(input.dailyIq),
    buildMentalDimension(input.mentalEdge, parentRedaction),
    buildPainDimension(input.painGuardrail, parentRedaction),
    buildHabitDimension(input.habitRecord),
    buildPlanDimension(input.dailyPlan)
  ];
  const liteDimensions = ATHLETEIQ_MODULE_REGISTRY
    .filter((module) => module.maturity === "lite_manual")
    .map((module): ProfileDimension => ({
      key: module.key,
      status: "lite_manual",
      moduleMaturity: module.maturity,
      claimBoundary: module.claimBoundary,
      valueSummary: null,
      sourceLabels: module.dataSources.map((source) => source.availability === "manual" ? "manual_data_required" : source.availability),
      visibilityByRole: module.allowedRoles,
      lastUpdatedAt: null,
      confidence: "low",
      missingData: ["manual_entry_required"],
      redactedFields: []
    }));
  const futureDimensions = ATHLETEIQ_MODULE_REGISTRY
    .filter((module) => module.maturity === "future")
    .map((module): ProfileDimension => ({
      key: module.key,
      status: "future",
      moduleMaturity: module.maturity,
      claimBoundary: module.claimBoundary,
      valueSummary: null,
      sourceLabels: ["future_source_only"],
      visibilityByRole: module.allowedRoles,
      lastUpdatedAt: null,
      confidence: "insufficient",
      missingData: ["future_partner_source"],
      redactedFields: []
    }));
  const redactions = activeDimensions.flatMap((dimension) => dimension.redactedFields.map((field) => `${dimension.key}.${field}`));

  return {
    athlete: {
      id: input.athleteId,
      name: input.athlete?.name ?? null,
      status: input.athlete?.status ?? null,
      position: input.athlete?.position ?? null,
      organisationId: input.athlete?.organisationId ?? null
    },
    view: input.view,
    activeDimensions,
    liteDimensions,
    futureDimensions,
    sourceConfidence: aggregateConfidence(activeDimensions),
    registryVersion: ATHLETEIQ_MODULE_REGISTRY_VERSION,
    projectionVersion: ATHLETEIQ_TWIN_PROJECTION_VERSION,
    redactions,
    updatedAt
  };
}

function buildReadinessDimension(dailyIq: DailyIqSnapshot | null): ProfileDimension {
  if (!dailyIq) return setupDimension("readiness", ["daily_iq"]);
  return {
    key: "readiness",
    status: "active",
    moduleMaturity: "active",
    claimBoundary: "backed_by_user_input",
    valueSummary: {
      dailyIqScore: dailyIq.dailyIqScore,
      readinessScore: dailyIq.readinessScore,
      confidence: dailyIq.confidence,
      dataUsed: dailyIq.dataUsed
    },
    sourceLabels: ["daily_iq", "daily_check_ins"],
    visibilityByRole: ["admin", "trainer", "performance_coach", "physio", "analyst", "athlete", "parent"],
    lastUpdatedAt: dailyIq.createdAt,
    confidence: dailyIq.confidence === "high" ? "high" : dailyIq.confidence === "insufficient" ? "insufficient" : "medium",
    missingData: dailyIq.missingData,
    redactedFields: []
  };
}

function buildMentalDimension(mentalEdge: MentalEdgeSnapshot | null, redacted: boolean): ProfileDimension {
  if (!mentalEdge) return setupDimension("mental_edge", ["mental_edge"]);
  if (redacted) return redactedDimension("mental_edge", mentalEdge.generatedAt, ["score", "riskLevel", "routines"]);
  return {
    key: "mental_edge",
    status: "active",
    moduleMaturity: "active",
    claimBoundary: "backed_by_user_input",
    valueSummary: {
      score: mentalEdge.score,
      riskLevel: mentalEdge.riskLevel,
      trend: mentalEdge.trend,
      routines: mentalEdge.routines.map((routine) => ({ routineId: routine.routineId, completed: routine.completed }))
    },
    sourceLabels: ["daily_check_ins"],
    visibilityByRole: ["admin", "trainer", "performance_coach", "physio", "athlete"],
    lastUpdatedAt: mentalEdge.generatedAt,
    confidence: mentalEdge.score === null ? "insufficient" : "medium",
    missingData: mentalEdge.missingData,
    redactedFields: []
  };
}

function buildPainDimension(painGuardrail: PainGuardrail | null, redacted: boolean): ProfileDimension {
  if (!painGuardrail) return setupDimension("pain_safety", ["pain_guardrail"]);
  if (redacted) return redactedDimension("pain_safety", painGuardrail.generatedAt, ["riskLevel", "reasonCodes"]);
  return {
    key: "pain_safety",
    status: "active",
    moduleMaturity: "active",
    claimBoundary: "backed_by_user_input",
    valueSummary: {
      state: painGuardrail.state,
      riskLevel: painGuardrail.riskLevel,
      maxTrainingIntensity: painGuardrail.maxTrainingIntensity,
      dailyIqCap: painGuardrail.dailyIqCap,
      reasonCodes: painGuardrail.reasonCodes
    },
    sourceLabels: ["daily_check_ins", "pain_guardrail"],
    visibilityByRole: ["admin", "trainer", "performance_coach", "physio", "athlete"],
    lastUpdatedAt: painGuardrail.generatedAt,
    confidence: painGuardrail.missingData.length ? "low" : "medium",
    missingData: painGuardrail.missingData,
    redactedFields: []
  };
}

function buildHabitDimension(habitRecord: HabitRecord | null): ProfileDimension {
  if (!habitRecord) return setupDimension("habits", ["habit_records"]);
  const completed = Object.values(habitRecord.statuses).filter(Boolean).length;
  const total = Object.keys(habitRecord.statuses).length;
  return {
    key: "habits",
    status: "active",
    moduleMaturity: "active",
    claimBoundary: "backed_by_user_input",
    valueSummary: { completed, total, completionRate: total ? Math.round((completed / total) * 100) : null },
    sourceLabels: ["habit_records"],
    visibilityByRole: ["admin", "trainer", "performance_coach", "athlete", "parent"],
    lastUpdatedAt: habitRecord.updatedAt,
    confidence: "medium",
    missingData: [],
    redactedFields: []
  };
}

function buildPlanDimension(dailyPlan: DailyPlan | null): ProfileDimension {
  if (!dailyPlan) return setupDimension("daily_plan", ["daily_plan"]);
  return {
    key: "daily_plan",
    status: "active",
    moduleMaturity: "active",
    claimBoundary: "backed_by_manual_entry",
    valueSummary: {
      status: dailyPlan.status,
      taskCount: dailyPlan.tasks.length,
      openTasks: dailyPlan.tasks.filter((task) => task.completionState === "open").length,
      recommendation: dailyPlan.recommendation
    },
    sourceLabels: dailyPlan.dataUsed,
    visibilityByRole: ["admin", "trainer", "performance_coach", "athlete"],
    lastUpdatedAt: dailyPlan.updatedAt,
    confidence: dailyPlan.missingData.length ? "low" : "medium",
    missingData: dailyPlan.missingData,
    redactedFields: []
  };
}

function setupDimension(key: string, missingData: string[]): ProfileDimension {
  return {
    key,
    status: "setup_required",
    moduleMaturity: "setup_required",
    claimBoundary: "no_live_claim",
    valueSummary: null,
    sourceLabels: [],
    visibilityByRole: ["admin", "trainer", "performance_coach", "physio", "analyst", "athlete", "parent"],
    lastUpdatedAt: null,
    confidence: "insufficient",
    missingData,
    redactedFields: []
  };
}

function redactedDimension(key: string, lastUpdatedAt: string | null, fields: string[]): ProfileDimension {
  return {
    key,
    status: "redacted",
    moduleMaturity: "redacted",
    claimBoundary: "redacted",
    valueSummary: null,
    sourceLabels: ["redacted_by_role"],
    visibilityByRole: ["admin", "trainer", "performance_coach", "physio", "athlete"],
    lastUpdatedAt,
    confidence: "insufficient",
    missingData: [],
    redactedFields: fields
  };
}

function aggregateConfidence(dimensions: ProfileDimension[]): ProfileSourceConfidence {
  const active = dimensions.filter((dimension) => dimension.status === "active");
  if (active.length === 0) return "insufficient";
  if (active.some((dimension) => dimension.confidence === "high")) return "high";
  if (active.length >= 3) return "medium";
  return "low";
}
