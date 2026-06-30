import { describe, expect, it } from "vitest";
import { toParentSafeReport } from "./parent-safe-report";
import type { AthleteReport } from "@/services/reporting.service";

const baseReport: AthleteReport = {
  athleteId: "a1",
  reportDate: "2026-06-29",
  dateRange: { from: "2026-06-22", to: "2026-06-29" },
  summary: "Weekly operating report",
  keyMetrics: {
    "Habit completion": "82%",
    "Readiness": 74,
    "Injury Risk Level": "high",
    "Load Ratio": 1.4,
  },
  coachNotes: ["internal note: monitor hamstring"],
  guidanceCommentary: "Engine reason: elevated load",
  sourceDataNotes: ["Confidence: medium"],
  provenance: {
    reportVersion: "report-1.1.0",
    generatedAt: "2026-06-29T00:00:00.000Z",
    dateRange: { from: "2026-06-22", to: "2026-06-29" },
    dimensions: [],
    movementScreen: { present: false, date: null },
    coachBaselineNotes: false,
    lastUpdatedAt: null,
    freshness: "missing",
    overallConfidence: "medium",
  },
};

describe("toParentSafeReport (#261)", () => {
  it("redacts clinical/injury metrics and lists them as coach-only", () => {
    const safe = toParentSafeReport(baseReport, { confidence: "medium" });
    const labels = safe.highlights.map((h) => h.label);

    expect(labels).toContain("Habit completion");
    expect(labels).toContain("Readiness");
    // Clinical figures never reach the parent view.
    expect(labels).not.toContain("Injury Risk Level");
    expect(labels).not.toContain("Load Ratio");
    expect(safe.coachOnlyKeys).toEqual(expect.arrayContaining(["Injury Risk Level", "Load Ratio"]));
  });

  it("never leaks coach notes or engine guidance into the parent projection", () => {
    const safe = toParentSafeReport(baseReport, { confidence: "high" });
    const serialized = JSON.stringify(safe);
    expect(serialized).not.toContain("internal note");
    expect(serialized).not.toContain("Engine reason");
  });

  it("maps confidence to an honest encouragement tone", () => {
    expect(toParentSafeReport(baseReport, { confidence: "high" }).encouragementKey).toBe("strong");
    expect(toParentSafeReport(baseReport, { confidence: "medium" }).encouragementKey).toBe("steady");
    expect(toParentSafeReport(baseReport, { confidence: "low" }).encouragementKey).toBe("building");
    // Unknown/insufficient confidence stays cautious, not falsely strong.
    expect(toParentSafeReport(baseReport, { confidence: "insufficient" }).encouragementKey).toBe("building");
    expect(toParentSafeReport(baseReport).encouragementKey).toBe("building");
    expect(toParentSafeReport(baseReport).confidenceBand).toBe("none");
  });

  it("preserves identity and date range", () => {
    const safe = toParentSafeReport(baseReport, { confidence: "medium" });
    expect(safe.athleteId).toBe("a1");
    expect(safe.dateRange).toEqual({ from: "2026-06-22", to: "2026-06-29" });
    expect(safe.summary).toBe("Weekly operating report");
  });
});
