import type { AssessmentRecord } from "@/types/assessment";
import type { HabigoalSettings } from "@/services/settings-service";
import { resolveCheckInConfig } from "@/lib/check-in-config";

export interface ConcernFlag {
  questionKey: string;
  score: number;
  threshold: number;
  severity: "watch" | "support";
}

export function evaluateCheckInConcerns(
  assessment: AssessmentRecord,
  settings: HabigoalSettings | null
): ConcernFlag[] {
  const config = resolveCheckInConfig(settings);
  const flags: ConcernFlag[] = [];
  const watchThreshold = settings?.alerting?.watchReadinessThreshold ?? 4;
  const supportThreshold = settings?.alerting?.supportReadinessThreshold ?? 3;

  for (const q of config.questions) {
    if (!q.enabled || !q.concernThreshold) continue;
    const scoreKey = q.key;
    const entry = assessment.scores[scoreKey];
    if (!entry || typeof entry.score !== "number") continue;
    if (entry.score <= q.concernThreshold) {
      flags.push({
        questionKey: scoreKey,
        score: entry.score,
        threshold: q.concernThreshold,
        severity: entry.score <= supportThreshold ? "support" : "watch",
      });
    }
  }

  if (assessment.computed?.ski != null && assessment.computed.ski <= supportThreshold) {
    flags.push({
      questionKey: "readiness_ski",
      score: assessment.computed.ski,
      threshold: supportThreshold,
      severity: "support",
    });
  } else if (assessment.computed?.ski != null && assessment.computed.ski <= watchThreshold) {
    flags.push({
      questionKey: "readiness_ski",
      score: assessment.computed.ski,
      threshold: watchThreshold,
      severity: "watch",
    });
  }

  return flags;
}
