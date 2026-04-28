import { sectionsForMode } from "@/lib/kidex-schema";
import type { AssessmentPayload, AssessmentRecord } from "@/types/assessment";

export function computeAssessment(payload: AssessmentPayload): AssessmentRecord["computed"] {
  const sections = sectionsForMode(payload.mode);
  const averages = Object.fromEntries(
    sections.map((section) => {
      const values = section.items
        .map((item) => payload.scores[item.key]?.score)
        .filter((value): value is number => typeof value === "number" && value >= 1 && value <= 6);
      return [section.key, values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null];
    })
  ) as Record<string, number | null>;

  const allItems = sections.flatMap((section) => section.items);
  const done = allItems.filter((item) => {
    const score = payload.scores[item.key]?.score;
    return typeof score === "number" && score >= 1 && score <= 6;
  }).length;

  const ski = sections.some((section) => averages[section.key] === null)
    ? null
    : sections.reduce((sum, section) => sum + (averages[section.key] ?? 0) * section.weight, 0);

  return {
    movementAverage: averages.movement,
    socialAverage: averages.social,
    mentalAverage: averages.mental,
    ski,
    completion: { done, total: allItems.length }
  };
}
