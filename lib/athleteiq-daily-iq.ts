import { getHabitScoreSummary } from "@/lib/athlete-habits";
import { ATHLETEIQ_MODULE_REGISTRY_VERSION } from "@/lib/athleteiq-modules";
import { scoreTrainingLoad } from "@/lib/operating-score";
import type { AthleteIqCheckInFieldKey, AthleteIqCheckInSnapshot } from "@/types/athleteiq-check-in";
import type {
  DailyIqComponentKey,
  DailyIqInput,
  DailyIqPainRiskLevel,
  DailyIqProjectionContext,
  DailyIqPublicSnapshot,
  DailyIqScoreConfidence,
  DailyIqSnapshot
} from "@/types/athleteiq-daily-iq";
import type { TrainingLoadRecord } from "@/types/training-load";

export const ATHLETEIQ_DAILY_IQ_CAPABILITY_KEY = "AIQ-1220";
export const ATHLETEIQ_DAILY_IQ_ALGORITHM_VERSION = "aiq-daily-iq-1220.1";

export const DAILY_IQ_WEIGHTS: Record<DailyIqComponentKey, number> = {
  readiness: 0.4,
  mentalEdge: 0.3,
  habit: 0.2,
  safeLoad: 0.1
};

const privateMentalRoles = new Set(["admin", "trainer", "performance_coach", "physio", "athlete"]);

export function buildDailyIqSnapshot(input: DailyIqInput, now = new Date()): DailyIqSnapshot {
  const createdAt = now.toISOString();
  const checkIn = input.checkInSnapshot;
  const readinessScore = checkIn ? computeReadinessScore(checkIn) : null;
  const mentalEdgeScore = checkIn ? computeMentalEdgeScore(checkIn) : null;
  const habitScore = input.habitRecord ? getHabitScoreSummary(input.habitRecord.statuses).score : null;
  const safeLoadScore = computeSafeLoadScore(checkIn, input.trainingLoadRecords);
  const painRiskLevel = getPainRiskLevel(checkIn);
  const confidence = getDailyIqConfidence({ checkIn, habitScore, safeLoadScore });
  const dataUsed = [
    ...(checkIn ? ["checkIn" as const] : []),
    ...(input.habitRecord ? ["habits" as const] : []),
    ...(safeLoadScore !== null ? ["sessionLoad" as const] : []),
    "moduleRegistry" as const
  ];
  const missingData = [
    ...(!checkIn ? ["checkIn" as const] : []),
    ...(!input.habitRecord ? ["habits" as const] : []),
    ...(safeLoadScore === null ? ["sessionLoad" as const] : [])
  ];
  const rawScore = confidence === "insufficient"
    ? null
    : weightedAverage({
        readiness: readinessScore,
        mentalEdge: mentalEdgeScore,
        habit: habitScore,
        safeLoad: safeLoadScore
      });
  const painCapApplied = getPainCap(painRiskLevel);
  const dailyIqScore = rawScore === null ? null : painCapApplied === null ? rawScore : Math.min(rawScore, painCapApplied);

  return {
    calculationId: crypto.randomUUID(),
    athleteId: input.athleteId,
    localDate: input.localDate,
    timezone: input.timezone,
    mode: input.mode,
    checkInSnapshotId: checkIn?.id,
    dailyIqScore,
    readinessScore,
    mentalEdgeScore,
    habitScore,
    safeLoadScore,
    painRiskLevel,
    confidence,
    dataUsed,
    missingData,
    explanation: buildExplanation({ confidence, painRiskLevel, missingData, painCapApplied }),
    algorithmVersion: ATHLETEIQ_DAILY_IQ_ALGORITHM_VERSION,
    moduleRegistryVersion: input.moduleRegistryVersion || ATHLETEIQ_MODULE_REGISTRY_VERSION,
    componentWeights: DAILY_IQ_WEIGHTS,
    painCapApplied,
    highIntensityBlocked: painRiskLevel === "high",
    createdAt
  };
}

export function projectDailyIqSnapshotForRole(snapshot: DailyIqSnapshot, context: DailyIqProjectionContext): DailyIqPublicSnapshot {
  const canViewMentalDetail = privateMentalRoles.has(context.role);
  if (canViewMentalDetail) {
    return { ...snapshot, redactions: [] };
  }

  return {
    ...snapshot,
    mentalEdgeScore: null,
    painRiskLevel: "redacted",
    explanation: snapshot.explanation.filter((line) => !line.includes("pain") && !line.includes("mental")),
    redactions: ["mentalEdgeScore", "painRiskLevel"]
  };
}

export function getDailyIqConfidence({
  checkIn,
  habitScore,
  safeLoadScore
}: {
  checkIn: AthleteIqCheckInSnapshot | null;
  habitScore: number | null;
  safeLoadScore: number | null;
}): DailyIqScoreConfidence {
  if (!checkIn) return "insufficient";
  const optionalSources = [habitScore !== null, safeLoadScore !== null].filter(Boolean).length;
  if (optionalSources === 2) return "high";
  if (optionalSources === 1) return "medium";
  return "low";
}

export function computeReadinessScore(checkIn: AthleteIqCheckInSnapshot) {
  return averageScores([
    scoreField(checkIn, "sleepQuality"),
    invertScore(scoreField(checkIn, "fatigue")),
    invertScore(scoreField(checkIn, "stress")),
    scoreField(checkIn, "mood")
  ]);
}

export function computeMentalEdgeScore(checkIn: AthleteIqCheckInSnapshot) {
  return averageScores([
    scoreField(checkIn, "mood"),
    invertScore(scoreField(checkIn, "stress")),
    scoreField(checkIn, "confidence"),
    scoreField(checkIn, "focus"),
    scoreField(checkIn, "motivation")
  ]);
}

export function computeSafeLoadScore(checkIn: AthleteIqCheckInSnapshot | null, trainingLoadRecords: TrainingLoadRecord[]) {
  const checkInLoad = numericRawValue(checkIn, "trainingLoad");
  if (typeof checkInLoad === "number") return scoreTrainingLoad(Math.round(checkInLoad));
  if (trainingLoadRecords.length === 0) return null;
  const totalLoad = trainingLoadRecords.reduce((sum, record) => sum + record.loadPoints, 0);
  return scoreTrainingLoad(Math.round(totalLoad));
}

export function getPainRiskLevel(checkIn: AthleteIqCheckInSnapshot | null): DailyIqPainRiskLevel {
  const pain = numericRawValue(checkIn, "pain");
  if (typeof pain !== "number" || pain <= 1) return "none";
  if (pain >= 7) return "high";
  if (pain >= 5) return "moderate";
  return "low";
}

function weightedAverage(scores: Record<DailyIqComponentKey, number | null>) {
  let total = 0;
  let weight = 0;

  for (const key of Object.keys(DAILY_IQ_WEIGHTS) as DailyIqComponentKey[]) {
    const score = scores[key];
    if (score === null) continue;
    total += score * DAILY_IQ_WEIGHTS[key];
    weight += DAILY_IQ_WEIGHTS[key];
  }

  return weight > 0 ? roundScore(total / weight) : null;
}

function buildExplanation({
  confidence,
  painRiskLevel,
  missingData,
  painCapApplied
}: {
  confidence: DailyIqScoreConfidence;
  painRiskLevel: DailyIqPainRiskLevel;
  missingData: DailyIqSnapshot["missingData"];
  painCapApplied: number | null;
}) {
  const explanation = [`Daily IQ confidence is ${confidence}.`];
  if (missingData.length) explanation.push(`Missing data: ${missingData.join(", ")}.`);
  if (painRiskLevel === "high") explanation.push("High pain caps Daily IQ at 60 and blocks high-intensity recommendations.");
  if (painRiskLevel === "moderate") explanation.push("Moderate pain keeps recommendations conservative.");
  if (painCapApplied !== null && painRiskLevel !== "high") explanation.push(`Pain guardrail cap applied at ${painCapApplied}.`);
  return explanation;
}

function getPainCap(painRiskLevel: DailyIqPainRiskLevel) {
  if (painRiskLevel === "high") return 60;
  if (painRiskLevel === "moderate") return 75;
  return null;
}

function numericRawValue(checkIn: AthleteIqCheckInSnapshot | null | undefined, key: AthleteIqCheckInFieldKey) {
  const value = checkIn?.values[key]?.rawValue;
  return typeof value === "number" ? value : null;
}

function scoreField(checkIn: AthleteIqCheckInSnapshot, key: AthleteIqCheckInFieldKey) {
  const value = checkIn.values[key]?.normalizedValue;
  return typeof value === "number" ? value : null;
}

function invertScore(value: number | null) {
  return value === null ? null : roundScore(100 - value);
}

function averageScores(values: Array<number | null>) {
  const available = values.filter((value): value is number => typeof value === "number");
  if (!available.length) return null;
  return roundScore(available.reduce((sum, value) => sum + value, 0) / available.length);
}

function roundScore(value: number) {
  return Number(value.toFixed(1));
}
