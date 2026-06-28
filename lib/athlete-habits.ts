export type HabitCategory = "training" | "learning" | "recovery" | "wellness";

export type HabitDefinition = {
  key: string;
  titleKey: string;
  category: HabitCategory;
};

export const HABIT_SCORE_VERSION = "2026-05-25";

export const habitCategoryWeights: Record<HabitCategory, number> = {
  training: 0.4,
  recovery: 0.3,
  wellness: 0.2,
  learning: 0.1
};

export const athleteHabitDefinitions: HabitDefinition[] = [
  { key: "extraTouches", titleKey: "habitExtraTouches", category: "training" },
  { key: "weakFoot", titleKey: "habitWeakFoot", category: "training" },
  { key: "tacticalLearning", titleKey: "habitTacticalLearning", category: "learning" },
  { key: "stretching", titleKey: "habitStretching", category: "recovery" },
  { key: "mobility", titleKey: "habitMobility", category: "recovery" },
  { key: "recoverySession", titleKey: "habitRecoverySession", category: "recovery" },
  { key: "hydration", titleKey: "habitHydration", category: "wellness" },
  { key: "nutrition", titleKey: "habitNutrition", category: "wellness" },
  { key: "sleepBeforeMidnight", titleKey: "habitSleepBeforeMidnight", category: "wellness" }
];

export type HabitCategoryScore = {
  key: HabitCategory;
  completed: number;
  total: number;
  weight: number;
  contribution: number;
};

export type HabitScoreSummary = {
  score: number;
  categories: HabitCategoryScore[];
  recoveryScore: number | null;
  strongestGapKey?: string;
  scorerVersion: string;
};

export type HabitRecordScoreSummary = HabitScoreSummary & {
  athleteId: string;
  date: string;
};

export function createEmptyHabitStatuses() {
  return Object.fromEntries(athleteHabitDefinitions.map((habit) => [habit.key, false])) as Record<string, boolean>;
}

export function normalizeHabitStatuses(input: Record<string, unknown> | null | undefined) {
  const base = createEmptyHabitStatuses();
  for (const habit of athleteHabitDefinitions) {
    if (typeof input?.[habit.key] === "boolean") {
      base[habit.key] = input[habit.key] as boolean;
    }
  }
  return base;
}

export function getHabitCompletion(statuses: Record<string, boolean>) {
  const completed = athleteHabitDefinitions.filter((habit) => statuses[habit.key]).length;
  const total = athleteHabitDefinitions.length;
  const score = total ? Math.round((completed / total) * 100) : 0;
  return { completed, total, score };
}

export function getHabitCategoryBreakdown(statuses: Record<string, boolean>) {
  return athleteHabitDefinitions.reduce<Record<HabitCategory, { completed: number; total: number }>>(
    (acc, habit) => {
      acc[habit.category].total += 1;
      if (statuses[habit.key]) acc[habit.category].completed += 1;
      return acc;
    },
    {
      training: { completed: 0, total: 0 },
      learning: { completed: 0, total: 0 },
      recovery: { completed: 0, total: 0 },
      wellness: { completed: 0, total: 0 }
    }
  );
}

export function getHabitScoreSummary(statuses: Record<string, boolean>): HabitScoreSummary {
  const normalizedStatuses = normalizeHabitStatuses(statuses);
  const breakdown = getHabitCategoryBreakdown(normalizedStatuses);
  const categories = (Object.keys(habitCategoryWeights) as HabitCategory[]).map((category) => {
    const entry = breakdown[category];
    const completionRatio = entry.total ? entry.completed / entry.total : 0;
    return {
      key: category,
      completed: entry.completed,
      total: entry.total,
      weight: habitCategoryWeights[category],
      contribution: roundHabitScore(completionRatio * habitCategoryWeights[category] * 100)
    };
  });
  const score = roundHabitScore(categories.reduce((sum, category) => sum + category.contribution, 0));
  const recoveryCategory = categories.find((category) => category.key === "recovery") ?? null;
  const strongestGapKey = athleteHabitDefinitions.find((habit) => !normalizedStatuses[habit.key])?.key;

  return {
    score,
    categories,
    recoveryScore: recoveryCategory && recoveryCategory.weight > 0
      ? roundHabitScore((recoveryCategory.contribution / recoveryCategory.weight))
      : null,
    strongestGapKey,
    scorerVersion: HABIT_SCORE_VERSION
  };
}

export function summarizeHabitRecords(records: Array<{ athleteId: string; date: string; statuses: Record<string, boolean> }>): HabitRecordScoreSummary[] {
  return records.map((record) => ({
    athleteId: record.athleteId,
    date: record.date,
    ...getHabitScoreSummary(record.statuses)
  }));
}

export function getHabitStreak(records: Array<{ date: string; statuses: Record<string, boolean> }>) {
  const sorted = records
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date))
    .filter((record, index, source) => source.findIndex((candidate) => candidate.date === record.date) === index);

  let streak = 0;
  for (const record of sorted) {
    const { completed, total } = getHabitCompletion(record.statuses);
    if (completed >= Math.ceil(total * 0.7)) {
      streak += 1;
      continue;
    }
    break;
  }

  return streak;
}

// --- Canonical, calendar-correct streak helpers (#426) ---------------------
// The legacy getHabitStreak above counts newest-first and breaks only on a
// *present* non-qualifying record, so it ignores calendar gaps and isn't anchored
// to today; it also hard-codes the >=70%-of-9 rule, which a 6-habit product can
// never satisfy. These helpers take an explicit qualifier so each surface picks
// its own rule, and they walk consecutive calendar days so "streak" means
// "days in a row".

export type DayRecordLike = { date: string; statuses: Record<string, boolean> };
export type StreakQualifier = (record: DayRecordLike) => boolean;

/** A day counts if at least one habit was completed (matches the consumer copy
 *  "your streak grows every day you complete at least one habit"). */
export const atLeastOneHabitCompleted: StreakQualifier = (record) =>
  getHabitCompletion(record.statuses).completed > 0;

/** A day counts if a majority (>=70%) of the canonical habit set was completed. */
export const majorityHabitsCompleted: StreakQualifier = (record) => {
  const { completed, total } = getHabitCompletion(record.statuses);
  return completed >= Math.ceil(total * 0.7);
};

function shiftIsoDay(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/**
 * Current streak = consecutive qualifying calendar days ending at `today`. If
 * today is not yet logged (or doesn't qualify), the count anchors at yesterday
 * so an un-started day doesn't reset a live streak. Breaks on the first missing
 * or non-qualifying day.
 */
export function computeCurrentStreak(
  records: DayRecordLike[],
  today: string,
  qualifies: StreakQualifier = atLeastOneHabitCompleted
): number {
  const byDate = new Map<string, DayRecordLike>();
  for (const record of records) byDate.set(record.date, record);

  const todayRecord = byDate.get(today);
  let cursor = todayRecord && qualifies(todayRecord) ? today : shiftIsoDay(today, -1);

  let streak = 0;
  for (;;) {
    const record = byDate.get(cursor);
    if (!record || !qualifies(record)) break;
    streak += 1;
    cursor = shiftIsoDay(cursor, -1);
  }
  return streak;
}

/** Longest run of consecutive qualifying calendar days in the history. */
export function computeBestStreak(
  records: DayRecordLike[],
  qualifies: StreakQualifier = atLeastOneHabitCompleted
): number {
  const dates = records.filter(qualifies).map((record) => record.date).sort();
  let best = 0;
  let run = 0;
  let previous: string | null = null;
  for (const date of dates) {
    run = previous && shiftIsoDay(previous, 1) === date ? run + 1 : 1;
    best = Math.max(best, run);
    previous = date;
  }
  return best;
}

function roundHabitScore(value: number) {
  return Number(value.toFixed(1));
}
