import { ObjectId } from "mongodb";
import { buildCoachProjection, buildParentProjection, buildStakeholderAthleteCard, buildStakeholderAlerts, buildTeamProjection } from "@/lib/athleteiq-stakeholder";
import { getLatestDailyIqSnapshot } from "@/repositories/athleteiq-daily-iq.repository";
import { getDailyPlanByDate } from "@/repositories/athleteiq-daily-plan.repository";
import { listPainAlertsByAthlete } from "@/repositories/athleteiq-pain-safety.repository";
import { getTwinProjectionSnapshot } from "@/repositories/athleteiq-twin-projection.repository";
import { getChildById } from "@/repositories/child.repository";
import { getTeamById } from "@/repositories/team.repository";
import { upsertCoachAction } from "@/repositories/coach-actions.repository";
import { getMentalEdgeToday } from "@/services/athleteiq-mental-edge.service";
import type { AuthUser } from "@/lib/access";
import type { StakeholderAthleteSource } from "@/lib/athleteiq-stakeholder";
import type { StakeholderActionState } from "@/types/athleteiq-stakeholder";

export async function getCoachDashboardProjection(input: {
  teamId: string;
  localDate: string;
  timezone?: string;
}) {
  const team = await getTeamById(input.teamId);
  if (!team) return null;
  const sources = await Promise.all(team.athleteIds.map((athleteId) => loadStakeholderSource({ athleteId, localDate: input.localDate, timezone: input.timezone, view: "coach" })));
  return buildCoachProjection({ teamId: input.teamId, localDate: input.localDate, sources });
}

export async function getTeamOverviewProjection(input: {
  teamId: string;
  localDate: string;
  timezone?: string;
}) {
  const team = await getTeamById(input.teamId);
  if (!team) return null;
  const sources = await Promise.all(team.athleteIds.map((athleteId) => loadStakeholderSource({ athleteId, localDate: input.localDate, timezone: input.timezone, view: "team" })));
  const cards = sources.map((source) => buildStakeholderAthleteCard(source, "team"));
  const alerts = sources.flatMap(buildStakeholderAlerts);
  return buildTeamProjection({ teamId: input.teamId, localDate: input.localDate, cards, alerts });
}

export async function getParentSummaryProjection(input: {
  athleteId: string;
  localDate: string;
  timezone?: string;
}) {
  const source = await loadStakeholderSource({ athleteId: input.athleteId, localDate: input.localDate, timezone: input.timezone, view: "parent" });
  return buildParentProjection({ source, localDate: input.localDate });
}

export async function recordStakeholderAlertAction(input: {
  alertId: string;
  athleteId: string;
  localDate: string;
  status: StakeholderActionState;
  detail?: string;
  user: AuthUser;
}) {
  return upsertCoachAction({
    athleteKey: input.athleteId,
    date: input.localDate,
    recommendationKey: input.alertId,
    status: input.status,
    severity: input.status === "ignored" ? "warning" : undefined,
    sourceType: "recommendation",
    sourceId: input.alertId,
    detail: input.detail,
    actorName: input.user.name,
    actorEmail: input.user.email
  });
}

async function loadStakeholderSource(input: {
  athleteId: string;
  localDate: string;
  timezone?: string;
  view: "coach" | "parent" | "team";
}): Promise<StakeholderAthleteSource> {
  const [dailyIq, mentalEdge, painAlerts, dailyPlan, twinProjection, athlete] = await Promise.all([
    getLatestDailyIqSnapshot({ athleteId: input.athleteId, localDate: input.localDate }),
    input.view === "parent" ? Promise.resolve(null) : getMentalEdgeToday({ athleteId: input.athleteId, localDate: input.localDate, timezone: input.timezone }),
    input.view === "parent" ? Promise.resolve([]) : listPainAlertsByAthlete(input.athleteId),
    getDailyPlanByDate(input.athleteId, input.localDate),
    getTwinProjectionSnapshot({ athleteId: input.athleteId, view: input.view }),
    ObjectId.isValid(input.athleteId) ? getChildById(new ObjectId(input.athleteId)) : Promise.resolve(null)
  ]);

  return {
    athleteId: input.athleteId,
    name: athlete?.name ?? twinProjection?.athlete.name ?? null,
    dailyIq,
    mentalEdge,
    painAlerts: painAlerts.filter((alert) => alert.localDate <= input.localDate).slice(0, 5),
    dailyPlan,
    twinProjection
  };
}
