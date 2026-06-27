import { listCoachActionsByDate } from "@/repositories/coach-actions.repository";
import { listChildrenWithMetrics, type ChildProfile } from "@/repositories/child.repository";
import { getDailyPlanByDate } from "@/repositories/athleteiq-daily-plan.repository";
import { getLatestDailyIqSnapshot } from "@/repositories/athleteiq-daily-iq.repository";
import { getAthleteIqCheckInSnapshot } from "@/repositories/athleteiq-check-in.repository";
import { listPainAlertsByAthlete } from "@/repositories/athleteiq-pain-safety.repository";
import { listTeams } from "@/repositories/team.repository";
import { getAuthUser, resolveAccessibleAthleteIds, type AuthUser } from "@/lib/access";
import { buildHabigoalDailyStatus, type HabigoalDailyStatus } from "@/lib/habigoal-status";
import { getHabitRecordByAthleteIdAndDate } from "@/repositories/habit-records.repository";
import type { CoachActionRecord } from "@/types/coach-action";
import type { Team } from "@/types/team";

export type AthleteIqDashboardSeverity = "risk" | "watch" | "good" | "missing";
export type AthleteIqDashboardState = "empty" | "partial" | "ready";

export type AthleteIqDashboardAthlete = {
  id: string;
  name: string;
  teamName: string | null;
  status: ChildProfile["status"] | null;
  readiness: number | null;
  load: number | null;
  mental: number | null;
  severity: AthleteIqDashboardSeverity;
  reasonKey: "painAlert" | "dailyIqRisk" | "missingDailyIq" | "active";
  actionKey: "reviewPain" | "reviewDailyIq" | "completeDailyIq" | "continuePlan";
  sourceKey: "painSafety" | "dailyIq" | "assessment" | "profile";
  openActionCount: number;
  openPainAlertCount: number;
  hasDailyPlan: boolean;
  habigoalDaily: {
    completionState: "missing" | "partial" | "complete";
    habitCompletion: string;
    source: "habigoal" | "athlete_iq" | "mixed";
    status: HabigoalDailyStatus | null;
  };
  missingFields: string[];
};

export type AthleteIqDashboardOperation = {
  id: "club-load" | "trainer-actions" | "team-readiness" | "club-services";
  value: string;
  state: Exclude<AthleteIqDashboardSeverity, "missing">;
};

export type AthleteIqDashboardService = {
  id: "daily-plan-coverage" | "daily-iq-coverage" | "coach-action-queue" | "team-roster-coverage";
  progress: number;
  status: "ready" | "inReview" | "missing";
};

export type AthleteIqProductDashboardProjection = {
  localDate: string;
  persona: "athlete" | "trainer";
  timezone: string;
  state: AthleteIqDashboardState;
  teamCount: number;
  athleteCount: number;
  openActionCount: number;
  averageReadiness: number | null;
  averageMental: number | null;
  dailyIqAverage: number | null;
  activeQueue: AthleteIqDashboardAthlete[];
  athletes: AthleteIqDashboardAthlete[];
  operations: AthleteIqDashboardOperation[];
  services: AthleteIqDashboardService[];
  missingData: string[];
};

const DEFAULT_TIMEZONE = "Europe/Budapest";

export function getBudapestLocalDate(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: DEFAULT_TIMEZONE,
    year: "numeric"
  }).format(date);
}

export async function getAthleteIqProductDashboardProjection(input: {
  localDate?: string;
  timezone?: string;
  user?: AuthUser | null;
} = {}): Promise<AthleteIqProductDashboardProjection> {
  const timezone = input.timezone ?? DEFAULT_TIMEZONE;
  const localDate = input.localDate ?? getBudapestLocalDate();
  const user = input.user === undefined ? await getAuthUser() : input.user;
  if (!user) return emptyDashboardProjection({ localDate, timezone });

  const [allAthletes, allTeams, allActions, allowedAthleteIds] = await Promise.all([
    listChildrenWithMetrics(),
    listTeams(),
    listCoachActionsByDate(localDate),
    resolveAccessibleAthleteIds(user)
  ]);

  const { actions, athletes, teams } = scopeDashboardData({
    actions: allActions,
    allowedAthleteIds,
    athletes: allAthletes,
    teams: allTeams,
    user
  });

  if (athletes.length === 0 && teams.length === 0 && actions.length === 0) {
    return emptyDashboardProjection({ localDate, timezone });
  }

  const teamsByAthleteId = mapTeamsByAthleteId(teams);
  const openActionCounts = new Map<string, number>();
  for (const action of actions) {
    if (action.status === "resolved" || action.status === "ignored" || action.status === "overridden") continue;
    openActionCounts.set(action.athleteKey, (openActionCounts.get(action.athleteKey) ?? 0) + 1);
  }

  const athleteRows = await Promise.all(
    athletes.map(async (athlete) => {
      const athleteId = getAthleteProfileId(athlete);
      const [dailyIq, dailyPlan, painAlerts, habigoalDaily] = await Promise.all([
        getLatestDailyIqSnapshot({ athleteId, localDate }),
        getDailyPlanByDate(athleteId, localDate),
        listPainAlertsByAthlete(athleteId),
        getHabigoalProfessionalDailySource(athleteId, localDate)
      ]);
      const activePainAlerts = painAlerts.filter((alert) => alert.state !== "resolved" && alert.state !== "dismissed");
      const readiness = scoreFromDailyIq(dailyIq?.dailyIqScore) ?? habigoalDaily.score ?? scoreFromFivePoint(athlete.latestReadiness);
      const mental = scoreFromDailyIq(dailyIq?.mentalEdgeScore) ?? scoreFromFivePoint(athlete.latestScores?.mental);
      const load = scoreFromDailyIq(dailyIq?.safeLoadScore);
      const missingFields = collectMissingAthleteFields(athlete, {
        hasDailyIq: Boolean(dailyIq),
        hasHabigoalDaily: habigoalDaily.completionState === "complete",
        hasTeam: Boolean(teamsByAthleteId.get(athleteId)?.name ?? athlete.teamId),
        hasReadiness: readiness !== null
      });
      const openPainAlertCount = activePainAlerts.length;
      const openActionCount = openActionCounts.get(athleteId) ?? 0;
      const severity = resolveSeverity({ readiness, openPainAlertCount, openActionCount, status: athlete.status ?? null });

      return {
        id: athleteId,
        name: athlete.name,
        teamName: teamsByAthleteId.get(athleteId)?.name ?? athlete.teamId ?? null,
        status: athlete.status ?? null,
        readiness,
        load,
        mental,
        severity,
        reasonKey: resolveReasonKey({ severity, hasDailyIq: Boolean(dailyIq), openPainAlertCount }),
        actionKey: resolveActionKey({ severity, hasDailyIq: Boolean(dailyIq), openPainAlertCount }),
        sourceKey: openPainAlertCount > 0 ? "painSafety" : dailyIq ? "dailyIq" : athlete.latestReadiness ? "assessment" : "profile",
        openActionCount,
        openPainAlertCount,
        hasDailyPlan: Boolean(dailyPlan),
        habigoalDaily: {
          completionState: habigoalDaily.completionState,
          habitCompletion: `${habigoalDaily.completedHabits}/${habigoalDaily.totalHabits}`,
          source: dailyIq && habigoalDaily.completionState !== "missing" ? "mixed" : habigoalDaily.completionState === "missing" ? "athlete_iq" : "habigoal",
          status: habigoalDaily.status
        },
        missingFields
      } satisfies AthleteIqDashboardAthlete;
    })
  );

  const scoredReadiness = athleteRows.map((athlete) => athlete.readiness).filter(isNumber);
  const scoredMental = athleteRows.map((athlete) => athlete.mental).filter(isNumber);
  const activeQueue = athleteRows
    .filter((athlete) => athlete.severity === "risk" || athlete.severity === "watch" || athlete.openActionCount > 0 || athlete.openPainAlertCount > 0)
    .sort((first, second) => severityRank(first.severity) - severityRank(second.severity) || (first.readiness ?? 101) - (second.readiness ?? 101));

  const averageReadiness = average(scoredReadiness);
  const averageMental = average(scoredMental);
  const dailyIqAverage = average(athleteRows.map((athlete) => athlete.readiness).filter(isNumber));
  const missingData = collectProjectionMissingData(athleteRows, teams, athletes.length);
  const state: AthleteIqDashboardState = athletes.length === 0 ? "empty" : missingData.length > 0 ? "partial" : "ready";

  return {
    localDate,
    persona: user.primaryRole === "athlete" ? "athlete" : "trainer",
    timezone,
    state,
    teamCount: teams.length,
    athleteCount: athletes.length,
    openActionCount: Array.from(openActionCounts.values()).reduce((sum, count) => sum + count, 0),
    averageReadiness,
    averageMental,
    dailyIqAverage,
    activeQueue,
    athletes: athleteRows,
    operations: buildOperations({
      teamCount: teams.length,
      openActionCount: Array.from(openActionCounts.values()).reduce((sum, count) => sum + count, 0),
      averageReadiness,
      athleteCount: athletes.length,
      dailyPlanCount: athleteRows.filter((athlete) => athlete.hasDailyPlan).length
    }),
    services: buildServices({
      athleteCount: athletes.length,
      dailyPlanCount: athleteRows.filter((athlete) => athlete.hasDailyPlan).length,
      dailyIqCount: athleteRows.filter((athlete) => athlete.readiness !== null).length,
      openActionCount: Array.from(openActionCounts.values()).reduce((sum, count) => sum + count, 0),
      rosteredAthleteCount: athleteRows.filter((athlete) => athlete.teamName).length
    }),
    missingData
  };
}

function emptyDashboardProjection(input: { localDate: string; timezone: string }): AthleteIqProductDashboardProjection {
  return {
    localDate: input.localDate,
    persona: "trainer",
    timezone: input.timezone,
    state: "empty",
    teamCount: 0,
    athleteCount: 0,
    openActionCount: 0,
    averageReadiness: null,
    averageMental: null,
    dailyIqAverage: null,
    activeQueue: [],
    athletes: [],
    operations: [],
    services: [],
    missingData: []
  };
}

function scopeDashboardData(input: {
  actions: CoachActionRecord[];
  allowedAthleteIds: string[] | null;
  athletes: ChildProfile[];
  teams: Team[];
  user: AuthUser;
}) {
  if (input.allowedAthleteIds === null) {
    return {
      actions: input.actions,
      athletes: input.athletes,
      teams: input.teams
    };
  }

  const explicitAthleteIds = new Set(input.allowedAthleteIds);
  const normalizedEmail = input.user.email.toLowerCase().trim();
  const assignedTeamIds = new Set(input.user.teamIds);
  const teams = input.teams.filter((team) => {
    const matchesAssignedTeam = Boolean(team._id && assignedTeamIds.has(team._id));
    const matchesTrainerEmail = team.trainerEmails.some((email) => email.toLowerCase().trim() === normalizedEmail);
    const matchesAccessibleAthlete = team.athleteIds.some((athleteId) => explicitAthleteIds.has(athleteId));
    return matchesAssignedTeam || matchesTrainerEmail || matchesAccessibleAthlete;
  });
  const canSeeTeamRoster = input.user.primaryRole !== "athlete" && input.user.primaryRole !== "parent";
  const scopedAthleteIds = canSeeTeamRoster
    ? new Set([...explicitAthleteIds, ...teams.flatMap((team) => team.athleteIds)])
    : explicitAthleteIds;

  return {
    actions: input.actions.filter((action) => scopedAthleteIds.has(action.athleteKey)),
    athletes: input.athletes.filter((athlete) => scopedAthleteIds.has(getAthleteProfileId(athlete))),
    teams
  };
}

function getAthleteProfileId(athlete: ChildProfile) {
  return String(athlete._id ?? athlete.surveyId ?? athlete.name);
}

function mapTeamsByAthleteId(teams: Team[]) {
  const map = new Map<string, Team>();
  for (const team of teams) {
    for (const athleteId of team.athleteIds) {
      if (!map.has(athleteId)) map.set(athleteId, team);
    }
  }
  return map;
}

function scoreFromDailyIq(value: number | null | undefined) {
  if (!isNumber(value)) return null;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function scoreFromFivePoint(value: number | null | undefined) {
  if (!isNumber(value) || value <= 0) return null;
  return Math.max(0, Math.min(100, Math.round((value / 5) * 100)));
}

function collectMissingAthleteFields(
  athlete: ChildProfile,
  flags: { hasDailyIq: boolean; hasHabigoalDaily: boolean; hasReadiness: boolean; hasTeam: boolean }
) {
  const missing = [];
  if (!athlete.birthDate) missing.push("birthDate");
  if (!athlete.status) missing.push("status");
  if (!flags.hasTeam) missing.push("team");
  if (!flags.hasDailyIq && !flags.hasHabigoalDaily) missing.push("dailyStatus");
  if (!flags.hasReadiness) missing.push("readiness");
  return missing;
}

async function getHabigoalProfessionalDailySource(athleteId: string, localDate: string) {
  const [lifestyleCheckIn, performanceCheckIn, habitRecord] = await Promise.all([
    getAthleteIqCheckInSnapshot(athleteId, localDate, "lifestyle"),
    getAthleteIqCheckInSnapshot(athleteId, localDate, "performance"),
    getHabitRecordByAthleteIdAndDate(athleteId, localDate)
  ]);
  const checkIn = lifestyleCheckIn ?? performanceCheckIn;
  const values = {
    energy: valueOrNull(invert(checkIn?.values.fatigue?.normalizedValue)),
    soreness: valueOrNull(checkIn?.values.pain?.normalizedValue),
    mood: valueOrNull(checkIn?.values.mood?.normalizedValue),
    sleep: valueOrNull(checkIn?.values.sleepQuality?.normalizedValue)
  };
  const completedHabits = habitRecord ? Object.values(habitRecord.statuses).filter(Boolean).length : 0;
  const totalHabits = habitRecord ? Object.keys(habitRecord.statuses).length : 6;
  const status = buildHabigoalDailyStatus({
    completedHabitCount: completedHabits,
    hasLiveCheckIn: Boolean(checkIn),
    hasLiveHabits: Boolean(habitRecord),
    totalHabitCount: totalHabits,
    values
  });
  return {
    completedHabits,
    completionState: !checkIn && !habitRecord ? "missing" as const : status.score === null ? "partial" as const : "complete" as const,
    score: status.score,
    status: status.score === null ? null : status.status,
    totalHabits
  };
}

function valueOrNull(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? Math.round(value) : null;
}

function invert(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? 100 - value : null;
}

function resolveSeverity(input: {
  openActionCount: number;
  openPainAlertCount: number;
  readiness: number | null;
  status: ChildProfile["status"] | null;
}): AthleteIqDashboardSeverity {
  if (input.openPainAlertCount > 0 || input.status === "injured" || input.status === "unavailable") return "risk";
  if (input.readiness === null) return "missing";
  if (input.readiness < 50 || input.openActionCount > 0) return "risk";
  if (input.readiness < 70) return "watch";
  return "good";
}

function resolveReasonKey(input: {
  hasDailyIq: boolean;
  openPainAlertCount: number;
  severity: AthleteIqDashboardSeverity;
}): AthleteIqDashboardAthlete["reasonKey"] {
  if (input.openPainAlertCount > 0) return "painAlert";
  if (!input.hasDailyIq) return "missingDailyIq";
  if (input.severity === "risk" || input.severity === "watch") return "dailyIqRisk";
  return "active";
}

function resolveActionKey(input: {
  hasDailyIq: boolean;
  openPainAlertCount: number;
  severity: AthleteIqDashboardSeverity;
}): AthleteIqDashboardAthlete["actionKey"] {
  if (input.openPainAlertCount > 0) return "reviewPain";
  if (!input.hasDailyIq) return "completeDailyIq";
  if (input.severity === "risk" || input.severity === "watch") return "reviewDailyIq";
  return "continuePlan";
}

function buildOperations(input: {
  athleteCount: number;
  averageReadiness: number | null;
  dailyPlanCount: number;
  openActionCount: number;
  teamCount: number;
}): AthleteIqDashboardOperation[] {
  return [
    {
      id: "club-load",
      value: String(input.teamCount),
      state: input.teamCount > 0 ? "good" : "watch"
    },
    {
      id: "trainer-actions",
      value: String(input.openActionCount),
      state: input.openActionCount > 0 ? "risk" : "good"
    },
    {
      id: "team-readiness",
      value: input.averageReadiness === null ? "-" : `${input.averageReadiness}%`,
      state: readinessState(input.averageReadiness)
    },
    {
      id: "club-services",
      value: `${input.dailyPlanCount}/${input.athleteCount}`,
      state: input.athleteCount > 0 && input.dailyPlanCount === input.athleteCount ? "good" : "watch"
    }
  ];
}

function buildServices(input: {
  athleteCount: number;
  dailyIqCount: number;
  dailyPlanCount: number;
  openActionCount: number;
  rosteredAthleteCount: number;
}): AthleteIqDashboardService[] {
  return [
    {
      id: "daily-plan-coverage",
      progress: coverage(input.dailyPlanCount, input.athleteCount),
      status: serviceStatus(input.dailyPlanCount, input.athleteCount)
    },
    {
      id: "daily-iq-coverage",
      progress: coverage(input.dailyIqCount, input.athleteCount),
      status: serviceStatus(input.dailyIqCount, input.athleteCount)
    },
    {
      id: "coach-action-queue",
      progress: input.openActionCount === 0 ? 100 : 0,
      status: input.openActionCount === 0 ? "ready" : "inReview"
    },
    {
      id: "team-roster-coverage",
      progress: coverage(input.rosteredAthleteCount, input.athleteCount),
      status: serviceStatus(input.rosteredAthleteCount, input.athleteCount)
    }
  ];
}

function serviceStatus(value: number, total: number): AthleteIqDashboardService["status"] {
  if (total === 0 || value === 0) return "missing";
  if (value < total) return "inReview";
  return "ready";
}

function coverage(value: number, total: number) {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
}

function collectProjectionMissingData(athletes: AthleteIqDashboardAthlete[], teams: Team[], athleteCount: number) {
  const missing = new Set<string>();
  if (athleteCount === 0) missing.add("athletes");
  if (teams.length === 0) missing.add("teams");
  for (const athlete of athletes) {
    for (const field of athlete.missingFields) missing.add(field);
  }
  return Array.from(missing);
}

function readinessState(value: number | null): Exclude<AthleteIqDashboardSeverity, "missing"> {
  if (value === null) return "watch";
  if (value < 50) return "risk";
  if (value < 70) return "watch";
  return "good";
}

function severityRank(severity: AthleteIqDashboardSeverity) {
  if (severity === "risk") return 0;
  if (severity === "watch") return 1;
  if (severity === "missing") return 2;
  return 3;
}

function average(values: number[]) {
  if (values.length === 0) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
