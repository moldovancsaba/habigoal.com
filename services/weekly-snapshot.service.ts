import { reportingService } from "@/services/reporting.service";
import { findTwinByAthleteId } from "@/repositories/athlete-twin.repository";
import { createEmptyTwin } from "@/lib/twin-updater";
import { listAssessmentsByChildId } from "@/repositories/assessment.repository";
import { listHabitRecordsByAthleteId } from "@/repositories/habit-records.repository";
import { listTrainingLoadRecordsByAthleteId } from "@/repositories/training-load.repository";
import { getHabitScoreSummary, getHabitCategoryBreakdown } from "@/lib/athlete-habits";
import { buildAthleteInsights } from "@/lib/athlete-insights";
import { buildWeeklySnapshot, type WeeklyAthleteSnapshot } from "@/lib/weekly-snapshot";
import { upsertWeeklySnapshot, getWeeklySnapshot, listWeeklySnapshots, type StoredWeeklySnapshot } from "@/repositories/weekly-snapshot.repository";

// Inclusive 7-day window ending 6 days after weekStart.
function weekEnd(weekStart: string): string {
  const d = new Date(`${weekStart}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 6);
  return d.toISOString().slice(0, 10);
}

function inRange(date: string, from: string, to: string): boolean {
  return date >= from && date <= to;
}

// Generate (or regenerate) and persist a reproducible weekly snapshot. Assembles
// the canonical week sources, runs the pure builder (#86), and upserts. Counts
// reflect only records actually found in the week — no fabrication.
export async function generateWeeklySnapshot(input: {
  athleteId: string;
  weekStart: string;
  createdBy: string;
  createdAt: string;
}): Promise<StoredWeeklySnapshot> {
  const { athleteId, weekStart, createdBy, createdAt } = input;
  const to = weekEnd(weekStart);

  const twin = (await findTwinByAthleteId(athleteId)) ?? createEmptyTwin(athleteId, "default");
  const report = await reportingService.generateAthleteReport(athleteId, twin, { from: weekStart, to });

  const assessments = (await listAssessmentsByChildId(athleteId)).filter((a) =>
    inRange(a.session?.date ?? "", weekStart, to)
  );
  const habitRecords = (await listHabitRecordsByAthleteId(athleteId)).filter((r) =>
    inRange(r.date, weekStart, to)
  );
  const loadRecords = await listTrainingLoadRecordsByAthleteId({ athleteId, from: weekStart, to });

  const latestHabit = habitRecords[habitRecords.length - 1] ?? null;
  const habitSummary = latestHabit ? getHabitScoreSummary(latestHabit.statuses) : null;
  const recovery = latestHabit ? getHabitCategoryBreakdown(latestHabit.statuses).recovery : null;

  const readinessScore = twin.recovery?.recoveryReadinessScore;
  const acwr = twin.performance?.acwr;

  const insights = buildAthleteInsights({
    athleteId,
    date: to,
    readiness: typeof readinessScore === "number" ? { score: readinessScore, date: twin.recovery?.updatedAt } : null,
    habitRecovery: recovery ? { completed: recovery.completed, total: recovery.total, date: latestHabit?.date } : null,
    load: typeof acwr === "number" ? { ratio: acwr, date: twin.performance?.updatedAt } : null,
  });

  const loadSummary =
    typeof acwr === "number" || typeof twin.performance?.acuteLoad7d === "number"
      ? {
          acwr: typeof acwr === "number" ? acwr : "n/a",
          acuteLoad7d: twin.performance?.acuteLoad7d ?? "n/a",
          chronicLoad28d: twin.performance?.chronicLoad28d ?? "n/a",
        }
      : null;

  const snapshot: WeeklyAthleteSnapshot = buildWeeklySnapshot({
    athleteId,
    weekStart,
    createdAt,
    createdBy,
    report,
    habitSummary,
    loadSummary,
    insights,
    checkInCount: assessments.length,
    habitRecordCount: habitRecords.length,
    loadEntryCount: loadRecords.length,
  });

  return upsertWeeklySnapshot(snapshot);
}

export async function getStoredWeeklySnapshot(athleteId: string, weekStart: string) {
  return getWeeklySnapshot(athleteId, weekStart);
}

export async function listStoredWeeklySnapshots(athleteId: string) {
  return listWeeklySnapshots(athleteId);
}
