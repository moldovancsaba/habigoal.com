import { sectionsForMode } from "@/lib/survey-schema";
import type { AssessmentPayload, AssessmentRecord } from "@/types/assessment";

export function computeAssessment(payload: AssessmentPayload): AssessmentRecord["computed"] {
  const sections = sectionsForMode(payload.mode);
  
  // Calculate averages by domain
  const domainValues: Record<string, number[]> = {
    movement: [],
    social: [],
    mental: []
  };

  sections.forEach((section) => {
    section.items.forEach((item) => {
      const score = payload.scores[item.key]?.score;
      if (typeof score === "number" && score >= 1 && score <= 6) {
        domainValues[section.domain].push(score);
      }
    });
  });

  const averages = {
    movement: domainValues.movement.length ? domainValues.movement.reduce((a, b) => a + b, 0) / domainValues.movement.length : null,
    social: domainValues.social.length ? domainValues.social.reduce((a, b) => a + b, 0) / domainValues.social.length : null,
    mental: domainValues.mental.length ? domainValues.mental.reduce((a, b) => a + b, 0) / domainValues.mental.length : null
  };

  const allItems = sections.flatMap((section) => section.items);
  const done = allItems.filter((item) => {
    const score = payload.scores[item.key]?.score;
    return typeof score === "number" && score >= 1 && score <= 6;
  }).length;

  // SKI is a weighted average of the section averages
  const skiAverages = Object.fromEntries(
    sections.map(section => {
      const values = section.items
        .map(item => payload.scores[item.key]?.score)
        .filter((v): v is number => typeof v === "number");
      return [section.key, values.length ? values.reduce((a, b) => a + b, 0) / values.length : null];
    })
  );

  const ski = sections.some(s => skiAverages[s.key] === null)
    ? null
    : sections.reduce((sum, s) => sum + (skiAverages[s.key] as number) * s.weight, 0);

  return {
    movementAverage: averages.movement,
    socialAverage: averages.social,
    mentalAverage: averages.mental,
    ski,
    completion: { done, total: allItems.length }
  };
}
