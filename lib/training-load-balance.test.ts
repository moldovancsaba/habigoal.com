import { describe, expect, it } from "vitest";
import { analyzeWeeklyLoad } from "./training-load-balance";

describe("weekly load balance (GH-527 P2)", () => {
  it("aggregates per day and totals the week", () => {
    const r = analyzeWeeklyLoad([
      { date: "2026-07-01", plannedLoadPoints: 300 },
      { date: "2026-07-01", plannedLoadPoints: 200 },
      { date: "2026-07-02", plannedLoadPoints: 400 },
    ]);
    expect(r.byDay).toEqual([
      { date: "2026-07-01", totalLoad: 500, sessionCount: 2, overloaded: false },
      { date: "2026-07-02", totalLoad: 400, sessionCount: 1, overloaded: false },
    ]);
    expect(r.weekTotal).toBe(900);
    expect(r.peakDayLoad).toBe(500);
  });

  it("flags overloaded days above the threshold", () => {
    const r = analyzeWeeklyLoad([{ date: "2026-07-01", plannedLoadPoints: 900 }], 700);
    expect(r.byDay[0].overloaded).toBe(true);
    expect(r.conflicts).toContainEqual({ date: "2026-07-01", type: "overload", load: 900 });
  });

  it("flags consecutive high-load days", () => {
    const r = analyzeWeeklyLoad(
      [
        { date: "2026-07-01", plannedLoadPoints: 800 },
        { date: "2026-07-02", plannedLoadPoints: 750 },
      ],
      700
    );
    expect(r.conflicts.some((c) => c.type === "consecutive_high" && c.date === "2026-07-02")).toBe(true);
  });

  it("does not flag consecutive when days are not adjacent", () => {
    const r = analyzeWeeklyLoad(
      [
        { date: "2026-07-01", plannedLoadPoints: 800 },
        { date: "2026-07-03", plannedLoadPoints: 800 },
      ],
      700
    );
    expect(r.conflicts.some((c) => c.type === "consecutive_high")).toBe(false);
  });

  it("treats missing load as zero", () => {
    const r = analyzeWeeklyLoad([{ date: "2026-07-01" }]);
    expect(r.byDay[0].totalLoad).toBe(0);
  });
});
