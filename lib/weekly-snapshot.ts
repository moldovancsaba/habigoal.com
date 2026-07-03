// Versioned weekly athlete snapshot (RPT-? / #86).
//
// Reports can drift if regenerated after scoring/report logic changes. A weekly
// snapshot captures the computed values *together with the versions and source
// counts that produced them*, so a week's output is reproducible and auditable.
// This is the pure builder — it composes already-computed pieces (the report with
// its provenance GH-200, habit scoring, load summary, reflections, and insight
// signals #81) into one immutable-shaped record. No fabrication: source counts
// and reflection themes come only from the records actually supplied.

import { HABIT_SCORE_VERSION, type HabitScoreSummary } from "@/lib/athlete-habits";
import { REPORT_VERSION, type AthleteReport } from "@/services/reporting.service";
import { INSIGHT_RULE_VERSION, type InsightSignal } from "@/lib/athlete-insights";

export const WEEKLY_SNAPSHOT_VERSION = "weekly-snapshot-1.0.0";

export interface WeeklySnapshotSourceCounts {
  check_in: number;
  habit_record: number;
  training_load: number;
  reflection: number;
}

export interface WeeklyAthleteSnapshot {
  athleteId: string;
  weekStart: string;
  metricsSummary: Record<string, number | string>;
  loadSummary: Record<string, number | string> | null;
  habitSummary: HabitScoreSummary | null;
  reflectionThemes: string[];
  insights: InsightSignal[];
  scorerVersion: string;
  reportVersion: string;
  insightRuleVersion: string;
  snapshotVersion: string;
  sourceCounts: WeeklySnapshotSourceCounts;
  createdAt: string;
  createdBy: string;
}

export interface WeeklySnapshotInput {
  athleteId: string;
  /** ISO date of the week's Monday (or chosen anchor). */
  weekStart: string;
  createdAt: string;
  createdBy: string;
  report: AthleteReport;
  habitSummary?: HabitScoreSummary | null;
  loadSummary?: Record<string, number | string> | null;
  /** Reflection records contributing to the week. */
  reflections?: Array<{ focusTomorrow?: string; win?: string; struggle?: string }>;
  insights?: InsightSignal[];
  /** Raw record counts for the week, for reproducibility/audit. */
  checkInCount?: number;
  habitRecordCount?: number;
  loadEntryCount?: number;
}

// Derive the distinct, non-empty reflection focus themes (order-preserving).
function reflectionThemes(reflections: WeeklySnapshotInput["reflections"]): string[] {
  const seen = new Set<string>();
  const themes: string[] = [];
  for (const r of reflections ?? []) {
    const theme = r.focusTomorrow?.trim();
    if (theme && !seen.has(theme.toLowerCase())) {
      seen.add(theme.toLowerCase());
      themes.push(theme);
    }
  }
  return themes;
}

// Build the reproducible snapshot. Pure and synchronous; callers persist the
// returned object as-is. Versions are captured so a later regeneration can be
// compared against the logic that produced the original.
export function buildWeeklySnapshot(input: WeeklySnapshotInput): WeeklyAthleteSnapshot {
  return {
    athleteId: input.athleteId,
    weekStart: input.weekStart,
    metricsSummary: input.report.keyMetrics,
    loadSummary: input.loadSummary ?? null,
    habitSummary: input.habitSummary ?? null,
    reflectionThemes: reflectionThemes(input.reflections),
    insights: input.insights ?? [],
    scorerVersion: HABIT_SCORE_VERSION,
    reportVersion: input.report.provenance?.reportVersion ?? REPORT_VERSION,
    insightRuleVersion: INSIGHT_RULE_VERSION,
    snapshotVersion: WEEKLY_SNAPSHOT_VERSION,
    sourceCounts: {
      check_in: Math.max(0, input.checkInCount ?? 0),
      habit_record: Math.max(0, input.habitRecordCount ?? 0),
      training_load: Math.max(0, input.loadEntryCount ?? 0),
      reflection: input.reflections?.length ?? 0,
    },
    createdAt: input.createdAt,
    createdBy: input.createdBy,
  };
}

// Whether two snapshots of the same week were produced by identical logic. Used
// to flag "stale — regenerate" when any version differs from the current code.
export function snapshotVersionsMatch(snapshot: WeeklyAthleteSnapshot): boolean {
  return (
    snapshot.scorerVersion === HABIT_SCORE_VERSION &&
    snapshot.reportVersion === REPORT_VERSION &&
    snapshot.insightRuleVersion === INSIGHT_RULE_VERSION &&
    snapshot.snapshotVersion === WEEKLY_SNAPSHOT_VERSION
  );
}
