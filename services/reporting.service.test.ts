import { describe, expect, it } from "vitest";
import { aggregateTeamReports } from "@/services/reporting.service";
import type { AthleteReport } from "@/services/reporting.service";

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
  };
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
