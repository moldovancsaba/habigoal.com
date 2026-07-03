import { describe, expect, it } from "vitest";
import { aggregateTeamTrend } from "./athleteiq-team-trends.service";

describe("team readiness trend aggregation (GH-526 P1)", () => {
  it("averages per day and counts contributors, excluding nulls", () => {
    const points = aggregateTeamTrend([
      { localDate: "2026-06-30", dailyIqScore: 80 },
      { localDate: "2026-06-30", dailyIqScore: 60 },
      { localDate: "2026-06-30", dailyIqScore: null },
      { localDate: "2026-07-01", dailyIqScore: 70 },
    ]);
    expect(points).toEqual([
      { date: "2026-06-30", avgDailyIq: 70, count: 2 },
      { date: "2026-07-01", avgDailyIq: 70, count: 1 },
    ]);
  });

  it("returns empty when no numeric scores", () => {
    expect(aggregateTeamTrend([{ localDate: "2026-07-01", dailyIqScore: null }])).toEqual([]);
  });

  it("sorts points chronologically", () => {
    const points = aggregateTeamTrend([
      { localDate: "2026-07-03", dailyIqScore: 50 },
      { localDate: "2026-07-01", dailyIqScore: 50 },
    ]);
    expect(points.map((p) => p.date)).toEqual(["2026-07-01", "2026-07-03"]);
  });
});
