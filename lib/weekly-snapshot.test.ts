import { describe, expect, it } from "vitest";
import {
  buildWeeklySnapshot,
  snapshotVersionsMatch,
  WEEKLY_SNAPSHOT_VERSION,
} from "./weekly-snapshot";
import { REPORT_VERSION, type AthleteReport } from "@/services/reporting.service";
import { HABIT_SCORE_VERSION } from "@/lib/athlete-habits";
import { INSIGHT_RULE_VERSION } from "@/lib/athlete-insights";

const report: AthleteReport = {
  athleteId: "a1",
  reportDate: "2026-06-29T00:00:00.000Z",
  dateRange: { from: "2026-06-22", to: "2026-06-29" },
  summary: "Weekly operating report",
  keyMetrics: { "Readiness Score": 72, "Readiness Zone": "good" },
  coachNotes: [],
  guidanceCommentary: "",
  sourceDataNotes: ["Confidence: medium"],
  provenance: {
    reportVersion: REPORT_VERSION,
    generatedAt: "2026-06-29T00:00:00.000Z",
    dateRange: { from: "2026-06-22", to: "2026-06-29" },
    dimensions: [],
    movementScreen: { present: false, date: null },
    coachBaselineNotes: false,
    lastUpdatedAt: null,
    freshness: "fresh",
    overallConfidence: "medium",
  },
};

const baseInput = {
  athleteId: "a1",
  weekStart: "2026-06-22",
  createdAt: "2026-06-29T12:00:00.000Z",
  createdBy: "coach@habigoal.local",
  report,
};

describe("buildWeeklySnapshot (#86)", () => {
  it("captures metrics, versions, and source counts for reproducibility", () => {
    const snap = buildWeeklySnapshot({
      ...baseInput,
      checkInCount: 6,
      habitRecordCount: 7,
      loadEntryCount: 5,
      reflections: [{ focusTomorrow: "scanning" }, { focusTomorrow: "weak foot" }],
    });
    expect(snap.metricsSummary).toEqual(report.keyMetrics);
    expect(snap.scorerVersion).toBe(HABIT_SCORE_VERSION);
    expect(snap.reportVersion).toBe(REPORT_VERSION);
    expect(snap.insightRuleVersion).toBe(INSIGHT_RULE_VERSION);
    expect(snap.snapshotVersion).toBe(WEEKLY_SNAPSHOT_VERSION);
    expect(snap.sourceCounts).toEqual({ check_in: 6, habit_record: 7, training_load: 5, reflection: 2 });
  });

  it("derives distinct, non-empty reflection themes in order", () => {
    const snap = buildWeeklySnapshot({
      ...baseInput,
      reflections: [
        { focusTomorrow: "Scanning" },
        { focusTomorrow: "  " },
        { focusTomorrow: "scanning" }, // duplicate (case-insensitive)
        { focusTomorrow: "weak foot" },
      ],
    });
    expect(snap.reflectionThemes).toEqual(["Scanning", "weak foot"]);
  });

  it("defaults missing optional sections without fabricating values", () => {
    const snap = buildWeeklySnapshot(baseInput);
    expect(snap.loadSummary).toBeNull();
    expect(snap.habitSummary).toBeNull();
    expect(snap.insights).toEqual([]);
    expect(snap.reflectionThemes).toEqual([]);
    expect(snap.sourceCounts).toEqual({ check_in: 0, habit_record: 0, training_load: 0, reflection: 0 });
  });

  it("snapshotVersionsMatch flags drift when any version differs", () => {
    const snap = buildWeeklySnapshot(baseInput);
    expect(snapshotVersionsMatch(snap)).toBe(true);
    expect(snapshotVersionsMatch({ ...snap, scorerVersion: "old" })).toBe(false);
    expect(snapshotVersionsMatch({ ...snap, reportVersion: "old" })).toBe(false);
  });
});
