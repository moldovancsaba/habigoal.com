import { evaluateCheckInConcerns } from "@/lib/concern-flags";
import { upsertCoachAction } from "@/repositories/coach-actions.repository";
import type { AssessmentRecord } from "@/types/assessment";
import type { HabigoalSettings } from "@/services/settings-service";

export async function syncConcernFlagsToCoachActions(
  assessment: AssessmentRecord,
  settings: HabigoalSettings | null
) {
  const athleteKey = assessment.childId?.toString() ?? "";
  if (!athleteKey) return [];

  const flags = evaluateCheckInConcerns(assessment, settings);
  const date = assessment.session?.date ?? new Date().toISOString().split("T")[0];

  for (const flag of flags) {
    await upsertCoachAction({
      athleteKey,
      date,
      recommendationKey: `concern:${flag.questionKey}`,
      status: "open",
      severity: flag.severity === "support" ? "critical" : "warning",
      sourceType: "readiness-threshold",
      sourceId: assessment._id?.toString(),
      detail: `${flag.questionKey} score ${flag.score} at or below threshold ${flag.threshold}`,
      actorName: "Habigoal System",
      actorEmail: "system@habigoal.local",
    });
  }

  return flags;
}
