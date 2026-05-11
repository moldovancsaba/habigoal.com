export type HabitCategory = "training" | "learning" | "recovery" | "wellness";

export type HabitDefinition = {
  key: string;
  titleKey: string;
  category: HabitCategory;
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
