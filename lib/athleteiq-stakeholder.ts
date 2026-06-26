import type { AuthUser } from "@/lib/access";
import type { DailyIqSnapshot } from "@/types/athleteiq-daily-iq";
import type { DailyPlan } from "@/types/athleteiq-daily-plan";
import type { MentalEdgeSnapshot } from "@/types/athleteiq-mental-edge";
import type { PainAlertRecord } from "@/types/athleteiq-pain-safety";
import type { AthleteTwinProjection } from "@/types/athleteiq-twin-projection";
import type {
  CoachProjection,
  ParentProjection,
  StakeholderActionState,
  StakeholderAlert,
  StakeholderAthleteCard,
  TeamProjection
} from "@/types/athleteiq-stakeholder";

export const ATHLETEIQ_STAKEHOLDER_CAPABILITY_KEY = "AIQ-1300";
export const ATHLETEIQ_STAKEHOLDER_VERSION = "aiq-stakeholder-1300.1";
export const TEAM_AGGREGATE_PRIVACY_THRESHOLD = 3;

export const stakeholderActionStates: StakeholderActionState[] = ["acknowledged", "applied", "resolved", "ignored"];

export type StakeholderAthleteSource = {
  athleteId: string;
  name?: string | null;
  dailyIq: DailyIqSnapshot | null;
  mentalEdge: MentalEdgeSnapshot | null;
  painAlerts: PainAlertRecord[];
  dailyPlan: DailyPlan | null;
  twinProjection: AthleteTwinProjection | null;
};

export function buildStakeholderAthleteCard(source: StakeholderAthleteSource, view: "coach" | "parent" | "team"): StakeholderAthleteCard {
  const redactedFields = view === "parent" ? ["mentalRiskLevel", "painRiskLevel"] : [];
  const sourceLabels = [
    ...(source.dailyIq ? ["daily_iq"] : []),
    ...(source.mentalEdge ? ["mental_edge"] : []),
    ...(source.painAlerts.length ? ["pain_alerts"] : []),
    ...(source.twinProjection ? ["digital_athlete_twin"] : [])
  ];
  const missingData = [
    ...(source.dailyIq ? [] : ["daily_iq"]),
    ...(source.mentalEdge ? [] : ["mental_edge"]),
    ...(source.twinProjection ? [] : ["digital_athlete_twin"])
  ];

  return {
    athleteId: source.athleteId,
    name: source.name ?? source.twinProjection?.athlete.name ?? null,
    readinessScore: source.dailyIq?.readinessScore ?? null,
    readinessBucket: readinessBucket(source.dailyIq),
    confidence: source.dailyIq?.confidence ?? "missing",
    painRiskLevel: redactedFields.includes("painRiskLevel") ? "redacted" : source.dailyIq?.painRiskLevel ?? source.painAlerts[0]?.riskLevel ?? "missing",
    mentalRiskLevel: redactedFields.includes("mentalRiskLevel") ? "redacted" : source.mentalEdge?.riskLevel ?? "missing",
    sourceLabels,
    missingData,
    redactedFields
  };
}

export function buildStakeholderAlerts(source: StakeholderAthleteSource): StakeholderAlert[] {
  const alerts: StakeholderAlert[] = [];
  for (const alert of source.painAlerts.filter((item) => item.state !== "resolved" && item.state !== "dismissed")) {
    alerts.push({
      id: alert.id ? `pain:${alert.id}` : `pain:${alert.athleteId}:${alert.localDate}`,
      athleteId: alert.athleteId,
      type: "pain",
      severity: alert.riskLevel === "high" || alert.state === "capped" || alert.state === "coach_review" ? "critical" : "watch",
      reasonCodes: alert.reasonCodes,
      recommendedActionKey: alert.requiredCopyKey,
      sourceLabels: ["pain_alerts"],
      redactedFields: ["locations"]
    });
  }

  if (source.mentalEdge?.alertCandidate) {
    alerts.push({
      id: `mental:${source.athleteId}:${source.mentalEdge.localDate}`,
      athleteId: source.athleteId,
      type: "mental",
      severity: source.mentalEdge.alertCandidate.severity === "high" ? "critical" : "watch",
      reasonCodes: source.mentalEdge.alertCandidate.reasonCodes,
      recommendedActionKey: source.mentalEdge.alertCandidate.recommendedCoachAction,
      sourceLabels: source.mentalEdge.alertCandidate.visibleSourceLabels,
      redactedFields: source.mentalEdge.alertCandidate.privateFieldsExcluded
    });
  }

  if (!source.dailyIq || source.dailyIq.confidence === "insufficient") {
    alerts.push({
      id: `incomplete:${source.athleteId}:${source.dailyIq?.localDate ?? "unknown"}`,
      athleteId: source.athleteId,
      type: "incomplete",
      severity: "info",
      reasonCodes: ["missing_daily_state"],
      recommendedActionKey: "athleteiq.stakeholders.actions.completeDailyCheckIn",
      sourceLabels: ["daily_iq"],
      redactedFields: []
    });
  } else if ((source.dailyIq.readinessScore ?? 100) < 45 && source.dailyIq.confidence !== "low") {
    alerts.push({
      id: `readiness:${source.athleteId}:${source.dailyIq.localDate}`,
      athleteId: source.athleteId,
      type: "readiness",
      severity: "watch",
      reasonCodes: ["low_readiness"],
      recommendedActionKey: "athleteiq.stakeholders.actions.reviewLoad",
      sourceLabels: ["daily_iq"],
      redactedFields: []
    });
  }

  return alerts.sort((left, right) => severityRank(right.severity) - severityRank(left.severity) || left.athleteId.localeCompare(right.athleteId));
}

export function buildTeamProjection(input: {
  teamId: string;
  localDate: string;
  cards: StakeholderAthleteCard[];
  alerts: StakeholderAlert[];
}, now = new Date()): TeamProjection {
  const suppressed = input.cards.length > 0 && input.cards.length < TEAM_AGGREGATE_PRIVACY_THRESHOLD;
  const distribution = { green: 0, yellow: 0, red: 0, incomplete: 0, suppressed };
  if (!suppressed) {
    for (const card of input.cards) distribution[card.readinessBucket] += 1;
  }

  return {
    view: "team",
    teamId: input.teamId,
    localDate: input.localDate,
    athleteCount: input.cards.length,
    readinessDistribution: distribution,
    flagsCount: input.alerts.filter((alert) => alert.severity !== "info").length,
    unavailableCount: input.cards.filter((card) => card.readinessBucket === "red" || card.readinessBucket === "incomplete").length,
    sourceLabels: Array.from(new Set(input.cards.flatMap((card) => card.sourceLabels))),
    redactions: suppressed ? ["readinessDistribution"] : [],
    generatedAt: now.toISOString(),
    version: ATHLETEIQ_STAKEHOLDER_VERSION
  };
}

export function buildCoachProjection(input: {
  teamId: string;
  localDate: string;
  sources: StakeholderAthleteSource[];
}, now = new Date()): CoachProjection {
  const athleteCards = input.sources.map((source) => buildStakeholderAthleteCard(source, "coach"));
  const alerts = input.sources.flatMap(buildStakeholderAlerts);
  const teamTrends = buildTeamProjection({ teamId: input.teamId, localDate: input.localDate, cards: athleteCards, alerts }, now);
  return {
    view: "coach",
    teamId: input.teamId,
    localDate: input.localDate,
    alerts,
    athleteCards,
    actionQueue: alerts.filter((alert) => alert.severity !== "info"),
    teamTrends,
    sourceLabels: teamTrends.sourceLabels,
    redactions: [],
    generatedAt: now.toISOString(),
    version: ATHLETEIQ_STAKEHOLDER_VERSION
  };
}

export function buildParentProjection(input: {
  source: StakeholderAthleteSource;
  localDate: string;
}, now = new Date()): ParentProjection {
  const completedTasks = input.source.dailyPlan?.tasks.filter((task) => task.completionState === "completed").length ?? 0;
  const totalTasks = input.source.dailyPlan?.tasks.length ?? 0;
  const card = buildStakeholderAthleteCard(input.source, "parent");
  const safeNotes = [
    card.readinessBucket === "incomplete" ? "Daily status is incomplete." : `Daily status bucket: ${card.readinessBucket}.`,
    totalTasks ? `${completedTasks} of ${totalTasks} daily tasks completed.` : "No daily tasks are available yet."
  ];
  const nextSupportAction = card.readinessBucket === "red"
    ? "athleteiq.parents.actions.encourageRecovery"
    : card.readinessBucket === "incomplete"
      ? "athleteiq.parents.actions.remindCheckIn"
      : "athleteiq.parents.actions.keepRoutine";

  return {
    view: "parent",
    athleteId: input.source.athleteId,
    localDate: input.localDate,
    dailySummary: safeNotes.join(" "),
    completedTasks,
    safeNotes,
    nextSupportAction,
    sourceLabels: card.sourceLabels,
    redactions: ["rawMentalSignals", "painLocations", "coachOnlyAlerts"],
    generatedAt: now.toISOString(),
    version: ATHLETEIQ_STAKEHOLDER_VERSION
  };
}

export function canViewTeamProjection(user: AuthUser, teamId: string, trainerEmails: string[]) {
  const normalized = user.email.toLowerCase().trim();
  return user.primaryRole === "admin" || user.teamIds.includes(teamId) || trainerEmails.includes(normalized);
}

function readinessBucket(snapshot: DailyIqSnapshot | null): StakeholderAthleteCard["readinessBucket"] {
  if (!snapshot || snapshot.dailyIqScore === null || snapshot.confidence === "insufficient") return "incomplete";
  if (snapshot.dailyIqScore >= 70) return "green";
  if (snapshot.dailyIqScore >= 45) return "yellow";
  return "red";
}

function severityRank(severity: StakeholderAlert["severity"]) {
  return severity === "critical" ? 3 : severity === "watch" ? 2 : 1;
}
