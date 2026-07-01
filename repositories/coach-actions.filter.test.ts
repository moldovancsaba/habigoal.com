import { describe, expect, it } from "vitest";
import { buildCoachActionsFilter } from "./coach-actions.repository";

describe("coach-actions filter builder (#525 P0)", () => {
  it("exact date wins over range", () => {
    expect(buildCoachActionsFilter({ date: "2026-07-01", from: "2026-06-01" })).toEqual({ date: "2026-07-01" });
  });

  it("builds a date range from from/to", () => {
    expect(buildCoachActionsFilter({ from: "2026-06-01", to: "2026-06-30" })).toEqual({
      date: { $gte: "2026-06-01", $lte: "2026-06-30" },
    });
  });

  it("filters by statuses, severity, sourceType, athleteKey", () => {
    const f = buildCoachActionsFilter({
      statuses: ["open", "acknowledged"],
      severity: "critical",
      sourceType: "recommendation",
      athleteKey: "a1",
    });
    expect(f.status).toEqual({ $in: ["open", "acknowledged"] });
    expect(f.severity).toBe("critical");
    expect(f.sourceType).toBe("recommendation");
    expect(f.athleteKey).toBe("a1");
  });

  it("empty query yields empty filter (no accidental date clause)", () => {
    expect(buildCoachActionsFilter({})).toEqual({});
    expect(buildCoachActionsFilter({ statuses: [] })).toEqual({});
  });
});
