import { athleteIqPillars, trackerQuestions } from "@/lib/readiness-model";
import type { AssessmentDomain, AssessmentMode, ScoreItemDefinition } from "@/types/assessment";

export interface ScoreSection {
  key: string;
  title: string;
  domain: AssessmentDomain;
  weight: number;
  items: ScoreItemDefinition[];
}

function item(
  key: string,
  domain: AssessmentDomain,
  title: string,
  prompt: string,
  inputKind: ScoreItemDefinition["inputKind"] = "choice"
): ScoreItemDefinition {
  return {
    key,
    domain,
    title,
    prompt,
    inputKind
  };
}

const athleteSections: ScoreSection[] = athleteIqPillars.map((pillar) => ({
  key: pillar.key,
  title: pillar.title,
  domain: pillar.domain,
  weight: 1 / athleteIqPillars.length,
  items: trackerQuestions
    .filter((question) => question.pillarKey === pillar.key)
    .map((question) => item(question.key, pillar.domain, question.title, question.prompt, "choice"))
}));

const sectionMap = new Map(athleteSections.map((section) => [section.key, section]));
const itemMap = new Map(athleteSections.flatMap((section) => section.items.map((entry) => [entry.key, entry])));

export function sectionsForMode(mode: AssessmentMode): ScoreSection[] {
  void mode;
  return athleteSections;
}

export function getSectionDefinition(key: string) {
  return sectionMap.get(key);
}

export function getItemDefinition(key: string) {
  return itemMap.get(key);
}
