import { ATHLETEIQ_MODULE_REGISTRY, ATHLETEIQ_MODULE_REGISTRY_VERSION, type AthleteIqModuleDefinition } from "@/lib/athleteiq-modules";
import type { DailyIqSnapshot } from "@/types/athleteiq-daily-iq";
import type { DailyPlan } from "@/types/athleteiq-daily-plan";
import type { ParentProjection, CoachProjection, TeamProjection } from "@/types/athleteiq-stakeholder";
import type { DailyReportSnapshot, DailyReportType, ReportSection } from "@/types/athleteiq-daily-report";

export const ATHLETEIQ_DAILY_REPORT_CAPABILITY_KEY = "AIQ-1310";
export const ATHLETEIQ_DAILY_REPORT_VERSION = "aiq-daily-report-1310.1";

export type DailyReportSourceBundle = {
  athleteId?: string;
  teamId?: string;
  reportType: DailyReportType;
  localDate: string;
  dailyIq?: DailyIqSnapshot | null;
  dailyPlan?: DailyPlan | null;
  parentProjection?: ParentProjection | null;
  coachProjection?: CoachProjection | null;
  teamProjection?: TeamProjection | null;
};

export function buildDailyReportSnapshot(input: DailyReportSourceBundle, now = new Date()): DailyReportSnapshot {
  const visibleModules = ATHLETEIQ_MODULE_REGISTRY.filter((module) => module.reportVisibility.includes(input.reportType));
  const activeSections = visibleModules
    .filter((module) => module.maturity === "active" || module.maturity === "lite_manual")
    .map((module) => buildSection(module, input));
  const roadmapAppendix = ATHLETEIQ_MODULE_REGISTRY
    .filter((module) => module.maturity === "future" || module.reportVisibility.includes("roadmap"))
    .map((module) => buildSection(module, input, "roadmap"));

  return {
    id: `aiq-daily-report:${crypto.randomUUID()}`,
    athleteId: input.athleteId,
    teamId: input.teamId,
    reportType: input.reportType,
    localDate: input.localDate,
    sections: activeSections,
    roadmapAppendix,
    dataUsed: Array.from(new Set(activeSections.flatMap((section) => section.dataUsed))),
    missingData: Array.from(new Set(activeSections.flatMap((section) => section.missingData))),
    moduleRegistryVersion: ATHLETEIQ_MODULE_REGISTRY_VERSION,
    algorithmVersions: collectAlgorithmVersions(input),
    generatedAt: now.toISOString(),
    reportVersion: ATHLETEIQ_DAILY_REPORT_VERSION
  };
}

export function validateDailyReportRequest(input: {
  reportType?: string;
  athleteId?: string;
  teamId?: string;
  localDate?: string;
}) {
  const errors: string[] = [];
  if (!input.reportType || !["athlete", "coach", "parent", "team"].includes(input.reportType)) errors.push("reportType must be athlete, coach, parent, or team");
  if (!input.localDate || !/^\d{4}-\d{2}-\d{2}$/.test(input.localDate)) errors.push("localDate must use YYYY-MM-DD");
  if (input.reportType === "team" || input.reportType === "coach") {
    if (!input.teamId) errors.push("teamId is required for coach and team reports");
  } else if (!input.athleteId) {
    errors.push("athleteId is required for athlete and parent reports");
  }
  return errors;
}

function buildSection(module: AthleteIqModuleDefinition, input: DailyReportSourceBundle, visibility: DailyReportType | "roadmap" = input.reportType): ReportSection {
  const dataUsed = module.dataSources.filter((source) => source.availability === "live").map((source) => source.key);
  const missingData = module.dataSources.filter((source) => source.availability !== "live").map((source) => source.key);
  const facts = factsForModule(module.key, input);
  const confidence = confidenceForModule(module.key, input);
  const shouldSuppressRecommendation = confidence === "low" || confidence === "insufficient" || module.maturity === "future" || module.maturity === "planned";

  return {
    key: module.key,
    titleKey: module.displayNameKey,
    maturity: module.maturity,
    visibility,
    claimBoundary: module.claimBoundary,
    facts,
    recommendations: shouldSuppressRecommendation ? ["athleteiq.reports.recommendations.reviewMissingData"] : [`athleteiq.reports.recommendations.${module.key}`],
    evidenceLabels: module.dataSources.map((source) => source.labelKey),
    dataUsed,
    missingData,
    confidence
  };
}

function factsForModule(moduleKey: string, input: DailyReportSourceBundle) {
  if (moduleKey === "readiness" && input.dailyIq) return [`Daily IQ: ${input.dailyIq.dailyIqScore ?? "missing"}`, `Confidence: ${input.dailyIq.confidence}`];
  if (moduleKey === "daily_plan" && input.dailyPlan) return [`Tasks: ${input.dailyPlan.tasks.length}`, `Recommendation: ${input.dailyPlan.recommendation.intensity}`];
  if (moduleKey === "parent_summary" && input.parentProjection) return [input.parentProjection.dailySummary];
  if (moduleKey === "coach_alerts" && input.coachProjection) return [`Alerts: ${input.coachProjection.alerts.length}`, `Action queue: ${input.coachProjection.actionQueue.length}`];
  if (moduleKey === "team_overview" && input.teamProjection) return [`Athletes: ${input.teamProjection.athleteCount}`, `Flags: ${input.teamProjection.flagsCount}`];
  return ["No live facts available for this section."];
}

function confidenceForModule(moduleKey: string, input: DailyReportSourceBundle) {
  if (moduleKey === "readiness" || moduleKey === "mental_edge" || moduleKey === "pain_safety") return input.dailyIq?.confidence ?? "insufficient";
  if (moduleKey === "team_overview") return input.teamProjection?.readinessDistribution.suppressed ? "low" : "medium";
  if (moduleKey === "daily_plan") return input.dailyPlan ? "medium" : "insufficient";
  return "medium";
}

function collectAlgorithmVersions(input: DailyReportSourceBundle) {
  return {
    ...(input.dailyIq ? { dailyIq: input.dailyIq.algorithmVersion, moduleRegistry: input.dailyIq.moduleRegistryVersion } : {}),
    ...(input.dailyPlan ? { dailyPlan: input.dailyPlan.version } : {}),
    stakeholder: input.parentProjection?.version ?? input.coachProjection?.version ?? input.teamProjection?.version ?? "not_used",
    report: ATHLETEIQ_DAILY_REPORT_VERSION
  };
}
