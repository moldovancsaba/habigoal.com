import { findTwinByAthleteId } from "@/repositories/athlete-twin.repository";
import { listHabitRecordsByAthleteId } from "@/repositories/habit-records.repository";
import { getHabitCategoryBreakdown } from "@/lib/athlete-habits";
import { buildAthleteInsights, INSIGHT_RULE_VERSION, type InsightSignal } from "@/lib/athlete-insights";

// Server-side, source-linked insight signals for the API (#81). Derives inputs
// from the athlete's *canonical* digital twin (recovery readiness score, ACWR)
// plus the latest recovery-habit record — the system's authoritative readiness/
// load values — and runs the same deterministic engine the UI uses. Deterministic
// and reproducible, so it is recomputed on read rather than persisted.
export async function getAthleteInsights(athleteId: string, opts: { now: number }): Promise<{
  insights: InsightSignal[];
  ruleVersion: string;
  generatedAt: string;
}> {
  const twin = await findTwinByAthleteId(athleteId);
  const habitRecords = await listHabitRecordsByAthleteId(athleteId);
  const latestHabit = habitRecords[habitRecords.length - 1] ?? null;
  const recovery = latestHabit ? getHabitCategoryBreakdown(latestHabit.statuses).recovery : null;

  const readinessScore = twin?.recovery?.recoveryReadinessScore;
  const acwr = twin?.performance?.acwr;
  const date = new Date(opts.now).toISOString().slice(0, 10);

  const insights = buildAthleteInsights({
    athleteId,
    date,
    readiness: typeof readinessScore === "number" ? { score: readinessScore, date: twin?.recovery?.updatedAt } : null,
    habitRecovery: recovery ? { completed: recovery.completed, total: recovery.total, date: latestHabit?.date } : null,
    load: typeof acwr === "number" ? { ratio: acwr, date: twin?.performance?.updatedAt } : null,
  });

  return { insights, ruleVersion: INSIGHT_RULE_VERSION, generatedAt: new Date(opts.now).toISOString() };
}
