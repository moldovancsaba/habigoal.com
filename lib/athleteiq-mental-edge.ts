import type { AthleteIqCheckInFieldKey, AthleteIqCheckInSnapshot } from "@/types/athleteiq-check-in";
import type {
  CoachMentalAlert,
  MentalEdgeEvaluationInput,
  MentalEdgeRiskLevel,
  MentalEdgeRoutine,
  MentalEdgeRoutineId,
  MentalEdgeSignal,
  MentalEdgeSnapshot,
  MentalEdgeTrend
} from "@/types/athleteiq-mental-edge";

export const ATHLETEIQ_MENTAL_EDGE_CAPABILITY_KEY = "AIQ-1230";
export const ATHLETEIQ_MENTAL_EDGE_ALGORITHM_VERSION = "aiq-mental-edge-1230.1";

const routineCatalog: Record<MentalEdgeRoutineId, Omit<MentalEdgeRoutine, "completed">> = {
  "breathing-reset": { routineId: "breathing-reset", labelKey: "athleteiq.mentalEdge.routines.breathingReset", reasonCode: "stress_support", estimatedMinutes: 3 },
  "confidence-note": { routineId: "confidence-note", labelKey: "athleteiq.mentalEdge.routines.confidenceNote", reasonCode: "confidence_support", estimatedMinutes: 4 },
  "recovery-reflection": { routineId: "recovery-reflection", labelKey: "athleteiq.mentalEdge.routines.recoveryReflection", reasonCode: "mood_support", estimatedMinutes: 5 },
  "coach-check-in": { routineId: "coach-check-in", labelKey: "athleteiq.mentalEdge.routines.coachCheckIn", reasonCode: "coach_support", estimatedMinutes: 5 }
};

export function isMentalEdgeRoutineId(value: unknown): value is MentalEdgeRoutineId {
  return typeof value === "string" && value in routineCatalog;
}

export function buildMentalEdgeSnapshot(input: MentalEdgeEvaluationInput, now = new Date()): MentalEdgeSnapshot {
  const score = input.today ? computeMentalEdgeScore(input.today) : null;
  const riskLevel = getMentalEdgeRiskLevel(input.today, score);
  const trend = computeMentalEdgeTrend(input.recent);
  const alertCandidate = buildCoachMentalAlert({ ...input, score, riskLevel, trend });
  const routines = selectMentalEdgeRoutines(riskLevel, input.today, input.completedRoutineIds);
  const missingData = getMissingSignals(input.today);

  return {
    athleteId: input.athleteId,
    localDate: input.localDate,
    timezone: input.timezone,
    score,
    riskLevel,
    trend,
    routines,
    alertCandidate,
    privateFieldsExcluded: ["reflectionBody"],
    dataUsed: input.today ? ["daily_check_ins"] : [],
    missingData,
    sourceLabels: getSourceLabels(input.today),
    algorithmVersion: ATHLETEIQ_MENTAL_EDGE_ALGORITHM_VERSION,
    checkInSnapshotId: input.today?.id,
    generatedAt: now.toISOString()
  };
}

export function computeMentalEdgeScore(snapshot: AthleteIqCheckInSnapshot) {
  const values = [
    normalized(snapshot, "mood"),
    invert(normalized(snapshot, "stress")),
    normalized(snapshot, "motivation"),
    normalized(snapshot, "confidence"),
    normalized(snapshot, "focus")
  ].filter((value): value is number => typeof value === "number");

  if (!values.length) return null;
  return round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

export function getMentalEdgeRiskLevel(snapshot: AthleteIqCheckInSnapshot | null, score: number | null): MentalEdgeRiskLevel {
  if (!snapshot || score === null) return "insufficient";
  if (hasExtremeMentalThreshold(snapshot)) return "urgent";
  if (score < 40) return "concern";
  if (score < 60) return "watch";
  return "stable";
}

export function hasExtremeMentalThreshold(snapshot: AthleteIqCheckInSnapshot) {
  const stress = rawNumber(snapshot, "stress");
  const mood = rawNumber(snapshot, "mood");
  const confidence = rawNumber(snapshot, "confidence");
  return stress >= 9 || (mood > 0 && mood <= 2) || (confidence > 0 && confidence <= 2);
}

function buildCoachMentalAlert(input: MentalEdgeEvaluationInput & { score: number | null; riskLevel: MentalEdgeRiskLevel; trend: MentalEdgeTrend }): CoachMentalAlert | null {
  if (!input.today) return null;

  const reasonCodes: string[] = [];
  if (input.riskLevel === "urgent") reasonCodes.push("extreme_threshold");
  if (input.score !== null && input.score < 40) reasonCodes.push("low_score_today");

  const lowRecentDays = input.recent.filter((snapshot) => {
    const score = computeMentalEdgeScore(snapshot);
    return score !== null && score < 60;
  }).length;
  if (lowRecentDays >= 2) reasonCodes.push("low_pattern_two_of_three");

  if (reasonCodes.length === 0) return null;

  return {
    athleteId: input.athleteId,
    localDate: input.localDate,
    severity: reasonCodes.includes("extreme_threshold") ? "high" : "moderate",
    reasonCodes,
    recommendedCoachAction: reasonCodes.includes("extreme_threshold") ? "Check in with the athlete today using supportive non-clinical language." : "Review the trend and offer a short support conversation.",
    visibleSourceLabels: ["mood", "stress", "motivation", "confidence", "focus"].filter((key) => Boolean(input.today?.values[key as AthleteIqCheckInFieldKey])),
    score: input.score,
    trend: input.trend,
    privateFieldsExcluded: ["reflectionBody"]
  };
}

function selectMentalEdgeRoutines(riskLevel: MentalEdgeRiskLevel, snapshot: AthleteIqCheckInSnapshot | null, completedRoutineIds: MentalEdgeRoutineId[]) {
  const ids = new Set<MentalEdgeRoutineId>();
  const stress = rawNumber(snapshot, "stress");
  const confidence = rawNumber(snapshot, "confidence");
  const mood = rawNumber(snapshot, "mood");

  if (riskLevel === "insufficient") ids.add("recovery-reflection");
  if (stress >= 6) ids.add("breathing-reset");
  if (confidence > 0 && confidence <= 5) ids.add("confidence-note");
  if (mood > 0 && mood <= 5) ids.add("recovery-reflection");
  if (riskLevel === "urgent" || riskLevel === "concern") ids.add("coach-check-in");
  if (ids.size === 0) ids.add("confidence-note");

  return Array.from(ids).map((routineId) => ({
    ...routineCatalog[routineId],
    completed: completedRoutineIds.includes(routineId)
  }));
}

function computeMentalEdgeTrend(recent: AthleteIqCheckInSnapshot[]): MentalEdgeTrend {
  const scores = recent
    .slice()
    .sort((a, b) => a.localDate.localeCompare(b.localDate))
    .map(computeMentalEdgeScore)
    .filter((score): score is number => typeof score === "number");

  if (scores.length < 2) return "unknown";
  const delta = scores[scores.length - 1] - scores[0];
  if (delta >= 8) return "improving";
  if (delta <= -8) return "declining";
  return "steady";
}

function getMissingSignals(snapshot: AthleteIqCheckInSnapshot | null): MentalEdgeSignal[] {
  if (!snapshot) return ["mood", "stress", "motivation", "confidence", "focus", "reflectionTone"];
  return (["mood", "stress", "motivation", "confidence", "focus"] as MentalEdgeSignal[]).filter((signal) => !snapshot.values[signal as AthleteIqCheckInFieldKey]).concat(["reflectionTone"]);
}

function getSourceLabels(snapshot: AthleteIqCheckInSnapshot | null) {
  if (!snapshot) return {};
  const labels: Partial<Record<MentalEdgeSignal, string>> = {};
  for (const signal of ["mood", "stress", "motivation", "confidence", "focus"] as MentalEdgeSignal[]) {
    const label = snapshot.sourceLabels[signal as AthleteIqCheckInFieldKey];
    if (typeof label === "string") labels[signal] = label;
  }
  return labels;
}

function rawNumber(snapshot: AthleteIqCheckInSnapshot | null | undefined, key: AthleteIqCheckInFieldKey) {
  const value = snapshot?.values[key]?.rawValue;
  return typeof value === "number" ? value : 0;
}

function normalized(snapshot: AthleteIqCheckInSnapshot, key: AthleteIqCheckInFieldKey) {
  const value = snapshot.values[key]?.normalizedValue;
  return typeof value === "number" ? value : null;
}

function invert(value: number | null) {
  return value === null ? null : round(100 - value);
}

function round(value: number) {
  return Number(value.toFixed(1));
}
