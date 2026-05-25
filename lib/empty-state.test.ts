import { describe, expect, it } from "vitest";
import { getAthleteEmptyStateAction } from "./empty-state";

describe("role-aware empty-state actions", () => {
  it("returns the next safe athlete action without exposing other athletes", () => {
    expect(getAthleteEmptyStateAction({
      role: "athlete",
      reason: "no_records",
      athleteId: "athlete-1"
    })).toEqual({
      labelKey: "newSurveyForChild",
      href: "/dashboard/assessment?childId=athlete-1",
      role: "athlete"
    });
  });

  it("does not offer navigation for permission or load failures", () => {
    expect(getAthleteEmptyStateAction({ role: "trainer", reason: "missing_permission", athleteId: "athlete-1" })).toBeNull();
    expect(getAthleteEmptyStateAction({ role: "admin", reason: "load_failed", athleteId: "athlete-1" })).toBeNull();
  });
});
