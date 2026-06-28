import { describe, expect, it } from "vitest";
import { toParentSummaryView } from "@/lib/parent-summary-view";
import type { ParentProjection } from "@/types/athleteiq-stakeholder";

function makeProjection(overrides: Partial<ParentProjection> = {}): ParentProjection {
  return {
    view: "parent",
    athleteId: "a1",
    localDate: "2026-06-28",
    dailySummary: "Daily status bucket: green. 2 of 3 daily tasks completed.",
    completedTasks: 2,
    safeNotes: ["Daily status bucket: green.", "2 of 3 daily tasks completed."],
    nextSupportAction: "athleteiq.parents.actions.keepRoutine",
    sourceLabels: ["daily-iq"],
    redactions: ["rawMentalSignals", "painLocations", "coachOnlyAlerts"],
    generatedAt: "2026-06-28T00:00:00.000Z",
    version: "v1",
    ...overrides
  };
}

describe("toParentSummaryView", () => {
  it("maps projection fields onto the parent-safe view model", () => {
    const view = toParentSummaryView(makeProjection());
    expect(view.athleteId).toBe("a1");
    expect(view.localDate).toBe("2026-06-28");
    expect(view.summary).toContain("green");
    expect(view.completedTasks).toBe(2);
    expect(view.safeNotes).toHaveLength(2);
    expect(view.supportActionKey).toBe("athleteiq.parents.actions.keepRoutine");
    expect(view.sourceLabels).toEqual(["daily-iq"]);
  });

  it("surfaces a redaction indicator without exposing redacted values", () => {
    const view = toParentSummaryView(makeProjection());
    expect(view.hasRedactions).toBe(true);
    expect(view.redactionCount).toBe(3);
    // The view model only carries the parent-safe fields — never the redacted
    // field names as renderable content.
    const serialized = JSON.stringify(view);
    expect(serialized).not.toContain("painLocations");
    expect(serialized).not.toContain("rawMentalSignals");
  });

  it("reports no redactions when the projection withholds nothing", () => {
    const view = toParentSummaryView(makeProjection({ redactions: [] }));
    expect(view.hasRedactions).toBe(false);
    expect(view.redactionCount).toBe(0);
  });

  it("defensively defaults missing array/number fields", () => {
    const view = toParentSummaryView(
      makeProjection({
        safeNotes: undefined as never,
        sourceLabels: undefined as never,
        redactions: undefined as never,
        completedTasks: undefined as never
      })
    );
    expect(view.safeNotes).toEqual([]);
    expect(view.sourceLabels).toEqual([]);
    expect(view.hasRedactions).toBe(false);
    expect(view.completedTasks).toBe(0);
  });
});
