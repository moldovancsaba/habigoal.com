import { buildDailyReportSnapshot } from "@/lib/athleteiq-daily-report";
import { getLatestDailyIqSnapshot } from "@/repositories/athleteiq-daily-iq.repository";
import { getDailyPlanByDate } from "@/repositories/athleteiq-daily-plan.repository";
import { getDailyReportById, getLatestDailyReport, insertDailyReportSnapshot } from "@/repositories/athleteiq-daily-report.repository";
import { getLiteModuleDailySummary } from "@/services/athleteiq-lite-modules.service";
import { getCoachDashboardProjection, getParentSummaryProjection, getTeamOverviewProjection } from "@/services/athleteiq-stakeholder.service";
import type { DailyReportType } from "@/types/athleteiq-daily-report";

export async function generateDailyReport(input: {
  reportType: DailyReportType;
  athleteId?: string;
  teamId?: string;
  localDate: string;
  timezone?: string;
}) {
  const [dailyIq, dailyPlan, liteGatewaySummary, parentProjection, coachProjection, teamProjection] = await Promise.all([
    input.athleteId ? getLatestDailyIqSnapshot({ athleteId: input.athleteId, localDate: input.localDate }) : Promise.resolve(null),
    input.athleteId ? getDailyPlanByDate(input.athleteId, input.localDate) : Promise.resolve(null),
    input.athleteId ? getLiteModuleDailySummary({ athleteId: input.athleteId, localDate: input.localDate }) : Promise.resolve(null),
    input.reportType === "parent" && input.athleteId ? getParentSummaryProjection({ athleteId: input.athleteId, localDate: input.localDate, timezone: input.timezone }) : Promise.resolve(null),
    input.reportType === "coach" && input.teamId ? getCoachDashboardProjection({ teamId: input.teamId, localDate: input.localDate, timezone: input.timezone }) : Promise.resolve(null),
    input.reportType === "team" && input.teamId ? getTeamOverviewProjection({ teamId: input.teamId, localDate: input.localDate, timezone: input.timezone }) : Promise.resolve(null)
  ]);

  const snapshot = buildDailyReportSnapshot({
    reportType: input.reportType,
    athleteId: input.athleteId,
    teamId: input.teamId,
    localDate: input.localDate,
    dailyIq,
    dailyPlan,
    liteGatewaySummary,
    parentProjection,
    coachProjection,
    teamProjection
  });
  return insertDailyReportSnapshot(snapshot);
}

export async function getLatestReport(input: {
  reportType: DailyReportType;
  athleteId?: string;
  teamId?: string;
  localDate: string;
}) {
  return getLatestDailyReport(input);
}

export async function getReportExport(id: string) {
  return getDailyReportById(id);
}
