export type AthleteIqPillarKey =
  | "physical_pillar"
  | "mental_pillar"
  | "sport_brain_pillar";

export type DailyTrackerQuestionKey =
  | "sleep_hours"
  | "sleep_quality"
  | "energy_level"
  | "body_feel"
  | "fuel_hydration"
  | "mood_state"
  | "stress_load"
  | "confidence_level"
  | "focus_level";

export const athleteIqPillars = [
  {
    key: "physical_pillar",
    title: "physicalPillarTitle",
    prompt: "physicalPillarPrompt",
    domain: "movement"
  },
  {
    key: "mental_pillar",
    title: "mentalPillarTitle",
    prompt: "mentalPillarPrompt",
    domain: "social"
  },
  {
    key: "sport_brain_pillar",
    title: "sportBrainPillarTitle",
    prompt: "sportBrainPillarPrompt",
    domain: "mental"
  }
] as const;

export const trackerQuestions = [
  {
    key: "sleep_hours",
    pillarKey: "physical_pillar",
    title: "sleepHoursTitle",
    prompt: "sleepHoursPrompt"
  },
  {
    key: "sleep_quality",
    pillarKey: "physical_pillar",
    title: "sleepQualityTitle",
    prompt: "sleepQualityPrompt"
  },
  {
    key: "energy_level",
    pillarKey: "physical_pillar",
    title: "energyTitle",
    prompt: "energyPrompt"
  },
  {
    key: "body_feel",
    pillarKey: "physical_pillar",
    title: "bodyFeelTitle",
    prompt: "bodyFeelPrompt"
  },
  {
    key: "fuel_hydration",
    pillarKey: "physical_pillar",
    title: "fuelHydrationTitle",
    prompt: "fuelHydrationPrompt"
  },
  {
    key: "mood_state",
    pillarKey: "mental_pillar",
    title: "moodTitle",
    prompt: "moodPrompt"
  },
  {
    key: "stress_load",
    pillarKey: "mental_pillar",
    title: "stressLoadTitle",
    prompt: "stressLoadPrompt"
  },
  {
    key: "confidence_level",
    pillarKey: "mental_pillar",
    title: "confidenceTitle",
    prompt: "confidencePrompt"
  },
  {
    key: "focus_level",
    pillarKey: "sport_brain_pillar",
    title: "focusTitle",
    prompt: "focusPrompt"
  }
] as const;

export const readinessChecklist = trackerQuestions.map((question) => ({ key: question.key, label: question.title }));

export function getReadinessMode(score: number, total = readinessChecklist.length) {
  if (total <= 0) return "light";
  const ratio = score / total;
  if (ratio >= 0.75) return "full";
  if (ratio >= 0.5) return "moderate";
  return "light";
}

export function getReadinessMessage(score: number, total = readinessChecklist.length) {
  return {
    mode: getReadinessMode(score, total),
    score,
    total
  };
}

export function getCoachRecommendation(pillarScores: Array<{ key: string; score: number | null }>, readinessScore: number) {
  const ranked = pillarScores
    .filter((pillar) => typeof pillar.score === "number")
    .sort((a, b) => (a.score as number) - (b.score as number))
    .slice(0, 2);
  const mode = getReadinessMode(readinessScore);
  return {
    mode,
    priorityKeys: ranked.length ? ranked.map((pillar) => pillar.key) : ["sport_brain_pillar"]
  };
}
