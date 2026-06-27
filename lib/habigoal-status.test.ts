import { describe, expect, it } from "vitest";
import { buildHabigoalDailyStatus } from "./habigoal-status";

describe("Habigoal backend daily status", () => {
  it("does not create a score when no live daily data exists", () => {
    const status = buildHabigoalDailyStatus({
      completedHabitCount: 0,
      hasLiveCheckIn: false,
      hasLiveHabits: false,
      totalHabitCount: 6,
      values: {
        energy: null,
        mood: null,
        sleep: null,
        soreness: null
      }
    });

    expect(status).toMatchObject({
      confidence: "none",
      nextActionKey: "needs_input",
      score: null,
      status: "needs_input"
    });
    expect(status.reasonCodes).toContain("no_daily_data");
  });

  it("calculates a deterministic daily status from saved check-in and habit data", () => {
    const status = buildHabigoalDailyStatus({
      completedHabitCount: 5,
      hasLiveCheckIn: true,
      hasLiveHabits: true,
      totalHabitCount: 6,
      values: {
        energy: 80,
        mood: 70,
        sleep: 90,
        soreness: 20
      }
    });

    expect(status).toMatchObject({
      confidence: "high",
      score: 81,
      status: "balanced"
    });
    expect(status.reasonCodes).toEqual(["all_daily_signals_present"]);
  });

  it("penalizes high soreness and reports reason codes without client-side scoring", () => {
    const status = buildHabigoalDailyStatus({
      completedHabitCount: 2,
      hasLiveCheckIn: true,
      hasLiveHabits: true,
      totalHabitCount: 6,
      values: {
        energy: 55,
        mood: 55,
        sleep: 65,
        soreness: 90
      }
    });

    expect(status.status).toBe("needs_support");
    expect(status.reasonCodes).toContain("high_soreness");
    expect(status.reasonCodes).toContain("habit_gap");
  });
});
