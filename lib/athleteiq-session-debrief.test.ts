import { describe, expect, it } from "vitest";
import { deriveDebriefAnalysis, adherenceBand } from "./athleteiq-session-debrief";

describe("session debrief analysis (#527 P2)", () => {
  it("realizes load by completion and bands adherence", () => {
    const a = deriveDebriefAnalysis({ plannedDurationMinutes: 60, estimatedLoadPoints: 400, completionPct: 50 });
    expect(a.realizedLoadPoints).toBe(200);
    expect(a.adherenceBand).toBe("partial");
    expect(a.adherencePct).toBe(50);
  });

  it("full completion keeps full load", () => {
    const a = deriveDebriefAnalysis({ plannedDurationMinutes: 45, estimatedLoadPoints: 300, completionPct: 100 });
    expect(a.realizedLoadPoints).toBe(300);
    expect(a.adherenceBand).toBe("full");
  });

  it("clamps out-of-range completion", () => {
    expect(deriveDebriefAnalysis({ plannedDurationMinutes: 30, estimatedLoadPoints: 100, completionPct: 140 }).realizedLoadPoints).toBe(100);
    expect(deriveDebriefAnalysis({ plannedDurationMinutes: 30, estimatedLoadPoints: 100, completionPct: -5 }).realizedLoadPoints).toBe(0);
  });

  it("bands: full>=90, partial>=50, low<50", () => {
    expect(adherenceBand(95)).toBe("full");
    expect(adherenceBand(60)).toBe("partial");
    expect(adherenceBand(20)).toBe("low");
  });
});
