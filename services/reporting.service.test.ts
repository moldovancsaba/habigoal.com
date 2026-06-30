import { describe, expect, it } from "vitest";
import {
  aggregateTeamReports,
  buildReportProvenance,
  provenanceToSourceNotes,
  REPORT_VERSION,
} from "@/services/reporting.service";
import type { AthleteReport, ReportProvenance } from "@/services/reporting.service";
import type { AthleteTwin } from "@/types/athlete-twin";

const EMPTY_PROVENANCE: ReportProvenance = {
  reportVersion: REPORT_VERSION,
  generatedAt: "2026-06-29T00:00:00.000Z",
  dateRange: { from: "2026-06-29", to: "2026-06-29" },
  dimensions: [],
  movementScreen: { present: false, date: null },
  coachBaselineNotes: false,
  lastUpdatedAt: null,
  freshness: "missing",
  overallConfidence: "none",
};

function report(athleteId: string, m: { score?: number; zone?: string; status?: string; risk?: string }): AthleteReport {
  return {
    athleteId,
    reportDate: "2026-06-29T00:00:00.000Z",
    dateRange: { from: "2026-06-29", to: "2026-06-29" },
    summary: "x",
    keyMetrics: {
      "Readiness Score": m.score ?? "n/a",
      "Readiness Zone": m.zone ?? "",
      "Recovery Status": m.status ?? "",
      "Injury Risk Level": m.risk ?? "",
    },
    coachNotes: [],
    guidanceCommentary: "",
    sourceDataNotes: [],
    provenance: EMPTY_PROVENANCE,
  };
}

const NOW = Date.parse("2026-06-29T12:00:00.000Z");

function dim(sources: string[], confidence: string, updatedAt: string | null) {
  return { sources, confidence, updatedAt: updatedAt ?? "" } as never;
}

function twinFixture(overrides: Partial<Record<string, unknown>> = {}): AthleteTwin {
  const base = {
    athleteId: "a1",
    organisationId: "o1",
    twinVersion: 1,
    schemaVersion: "1",
    lastUpdatedAt: "2026-06-29T08:00:00.000Z",
    physical: dim([], "low", null),
    performance: dim(["training_load"], "medium", "2026-06-29T08:00:00.000Z"),
    technical: dim([], "low", null),
    recovery: dim(["check_in", "wearable"], "high", "2026-06-29T08:00:00.000Z"),
    cognitive: dim([], "low", null),
    history: [],
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-29T08:00:00.000Z",
  };
  return { ...base, ...overrides } as AthleteTwin;
}

describe("aggregateTeamReports (#198)", () => {
  it("returns empty distributions and null average for no reports", () => {
    expect(aggregateTeamReports([])).toEqual({
      averageReadiness: null,
      readinessZones: {},
      recoveryStatuses: {},
      injuryRiskLevels: {},
      flaggedAthleteIds: [],
    });
  });

  it("tallies distributions and averages numeric readiness", () => {
    const agg = aggregateTeamReports([
      report("a1", { score: 80, zone: "good", status: "recovered", risk: "low" }),
      report("a2", { score: 60, zone: "moderate", status: "partial", risk: "elevated" }),
      report("a3", { score: 40, zone: "moderate", status: "under_recovered", risk: "high" }),
    ]);
    expect(agg.averageReadiness).toBe(60);
    expect(agg.readinessZones).toEqual({ good: 1, moderate: 2 });
    expect(agg.recoveryStatuses).toEqual({ recovered: 1, partial: 1, under_recovered: 1 });
    expect(agg.injuryRiskLevels).toEqual({ low: 1, elevated: 1, high: 1 });
  });

  it("flags high injury risk or under-recovered athletes", () => {
    const agg = aggregateTeamReports([
      report("a1", { score: 90, zone: "peak", status: "recovered", risk: "low" }),
      report("a2", { score: 50, zone: "fatigued", status: "under_recovered", risk: "elevated" }),
      report("a3", { score: 55, zone: "moderate", status: "partial", risk: "high" }),
    ]);
    expect(agg.flaggedAthleteIds.sort()).toEqual(["a2", "a3"]);
  });

  it("ignores non-numeric readiness scores when averaging", () => {
    const agg = aggregateTeamReports([
      report("a1", { zone: "good" }), // score "n/a"
      report("a2", { score: 70, zone: "good" }),
    ]);
    expect(agg.averageReadiness).toBe(70);
    expect(agg.readinessZones).toEqual({ good: 2 });
  });
});

describe("buildReportProvenance (#200 RPT-005)", () => {
  it("captures per-dimension sources, confidence, and update dates", () => {
    const p = buildReportProvenance({
      twin: twinFixture(),
      dateRange: { from: "2026-06-22", to: "2026-06-29" },
      generatedAt: "2026-06-29T12:00:00.000Z",
      recommendationConfidence: "high",
      movementScreen: { present: true, date: "2026-06-20" },
      coachBaselineNotes: true,
      now: NOW,
    });
    expect(p.reportVersion).toBe(REPORT_VERSION);
    expect(p.dimensions).toHaveLength(5);
    const recovery = p.dimensions.find((d) => d.dimension === "recovery");
    expect(recovery?.sources).toEqual(["check_in", "wearable"]);
    expect(recovery?.confidence).toBe("high");
    expect(p.movementScreen).toEqual({ present: true, date: "2026-06-20" });
    expect(p.coachBaselineNotes).toBe(true);
  });

  it("takes the weakest contributing dimension as the overall band", () => {
    // contributing: performance(medium) + recovery(high) + rec(high) -> medium
    const p = buildReportProvenance({
      twin: twinFixture(),
      dateRange: { from: "2026-06-22", to: "2026-06-29" },
      generatedAt: "2026-06-29T12:00:00.000Z",
      recommendationConfidence: "high",
      movementScreen: { present: false, date: null },
      coachBaselineNotes: false,
      now: NOW,
    });
    expect(p.freshness).toBe("fresh");
    expect(p.overallConfidence).toBe("medium");
  });

  it("never overstates: no contributing source -> none", () => {
    const twin = twinFixture({
      performance: dim([], "high", null),
      recovery: dim([], "high", null),
    });
    const p = buildReportProvenance({
      twin,
      dateRange: { from: "2026-06-22", to: "2026-06-29" },
      generatedAt: "2026-06-29T12:00:00.000Z",
      recommendationConfidence: "high",
      movementScreen: { present: false, date: null },
      coachBaselineNotes: false,
      now: NOW,
    });
    expect(p.overallConfidence).toBe("none");
  });

  it("downgrades the band one step when the twin is stale", () => {
    const twin = twinFixture({ lastUpdatedAt: "2026-06-20T00:00:00.000Z" }); // >72h old
    const p = buildReportProvenance({
      twin,
      dateRange: { from: "2026-06-22", to: "2026-06-29" },
      generatedAt: "2026-06-29T12:00:00.000Z",
      recommendationConfidence: "high",
      movementScreen: { present: false, date: null },
      coachBaselineNotes: false,
      now: NOW,
    });
    expect(p.freshness).toBe("stale");
    expect(p.overallConfidence).toBe("low"); // medium -> low
  });
});

describe("provenanceToSourceNotes (#200)", () => {
  it("renders complete notes and keeps a parseable Confidence line last", () => {
    const p = buildReportProvenance({
      twin: twinFixture(),
      dateRange: { from: "2026-06-22", to: "2026-06-29" },
      generatedAt: "2026-06-29T12:00:00.000Z",
      recommendationConfidence: "high",
      movementScreen: { present: true, date: "2026-06-20" },
      coachBaselineNotes: true,
      now: NOW,
    });
    const notes = provenanceToSourceNotes(p);
    expect(notes[0]).toBe("Date range: 2026-06-22 to 2026-06-29");
    expect(notes.some((n) => n.startsWith("Recovery data: check_in, wearable"))).toBe(true);
    expect(notes.some((n) => n === "Movement screen (FMS): 2026-06-20")).toBe(true);
    // Contract: the parent-safe projection / hub badge parse this last line.
    const last = notes[notes.length - 1];
    expect(last).toBe("Confidence: medium");
    expect(last.split(":")[1].trim()).toBe("medium");
  });
});
