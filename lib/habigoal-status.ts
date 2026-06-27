export type HabigoalMetricValues = {
  energy: number | null;
  soreness: number | null;
  mood: number | null;
  sleep: number | null;
};

export type HabigoalDailyStatus = "needs_input" | "balanced" | "watch" | "needs_support";
export type HabigoalConfidence = "none" | "low" | "medium" | "high";

export type HabigoalDailyStatusProjection = {
  confidence: HabigoalConfidence;
  missingSignals: string[];
  nextActionKey: string;
  reasonCodes: string[];
  score: number | null;
  status: HabigoalDailyStatus;
};

export function buildHabigoalDailyStatus(input: {
  completedHabitCount: number;
  hasLiveCheckIn: boolean;
  hasLiveHabits: boolean;
  totalHabitCount: number;
  values: HabigoalMetricValues;
}): HabigoalDailyStatusProjection {
  const metricEntries = Object.entries(input.values) as Array<[keyof HabigoalMetricValues, number | null]>;
  const availableMetrics = metricEntries.filter(([, value]) => typeof value === "number" && Number.isFinite(value));
  const missingSignals = metricEntries
    .filter(([, value]) => typeof value !== "number" || !Number.isFinite(value))
    .map(([key]) => key);

  if (!input.hasLiveCheckIn && !input.hasLiveHabits) {
    return {
      confidence: "none",
      missingSignals: [...missingSignals, "habits"],
      nextActionKey: "needs_input",
      reasonCodes: ["no_daily_data"],
      score: null,
      status: "needs_input"
    };
  }

  const readiness = availableMetrics.length
    ? average(availableMetrics.map(([key, value]) => key === "soreness" ? 100 - (value as number) : value as number))
    : null;
  const habitAdherence = input.hasLiveHabits && input.totalHabitCount > 0
    ? input.completedHabitCount / input.totalHabitCount
    : null;
  const soreness = input.values.soreness;
  const sorenessPenalty = typeof soreness === "number" && soreness >= 75 ? 10 : 0;
  const reasonCodes: string[] = [];

  if (missingSignals.length > 0) reasonCodes.push("partial_check_in");
  if (!input.hasLiveHabits) reasonCodes.push("missing_habits");
  if (typeof soreness === "number" && soreness >= 75) reasonCodes.push("high_soreness");
  if (habitAdherence !== null && habitAdherence < 0.5) reasonCodes.push("habit_gap");

  const rawScore = calculateAvailableScore({
    habitAdherence,
    readiness,
    sorenessPenalty
  });
  const score = rawScore === null ? null : clamp(Math.round(rawScore), 0, 100);
  const confidence = classifyConfidence({
    hasLiveHabits: input.hasLiveHabits,
    metricCount: availableMetrics.length,
    score
  });
  const status = classifyStatus({ confidence, score, soreness });

  return {
    confidence,
    missingSignals: [
      ...missingSignals,
      ...(!input.hasLiveHabits ? ["habits"] : [])
    ],
    nextActionKey: status,
    reasonCodes: reasonCodes.length ? reasonCodes : ["all_daily_signals_present"],
    score,
    status
  };
}

function calculateAvailableScore(input: {
  habitAdherence: number | null;
  readiness: number | null;
  sorenessPenalty: number;
}) {
  if (input.readiness === null && input.habitAdherence === null) return null;
  if (input.readiness !== null && input.habitAdherence !== null) {
    return (0.7 * input.readiness) + (0.3 * input.habitAdherence * 100) - input.sorenessPenalty;
  }
  if (input.readiness !== null) return input.readiness - input.sorenessPenalty;
  return (input.habitAdherence as number) * 100;
}

function classifyConfidence(input: { hasLiveHabits: boolean; metricCount: number; score: number | null }): HabigoalConfidence {
  if (input.score === null) return "none";
  if (input.metricCount >= 4 && input.hasLiveHabits) return "high";
  if (input.metricCount >= 3 || (input.metricCount > 0 && input.hasLiveHabits)) return "medium";
  return "low";
}

function classifyStatus(input: {
  confidence: HabigoalConfidence;
  score: number | null;
  soreness: number | null;
}): HabigoalDailyStatus {
  if (input.score === null || input.confidence === "none") return "needs_input";
  if (input.score >= 78 && input.soreness !== null && input.soreness < 60 && input.confidence !== "low") return "balanced";
  if (input.score >= 62) return "watch";
  return "needs_support";
}

function average(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
