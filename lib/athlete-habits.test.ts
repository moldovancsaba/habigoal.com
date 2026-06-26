import { describe, expect, it } from "vitest";
import {
  HABIT_SCORE_VERSION,
  getHabitScoreSummary,
  normalizeHabitStatuses
} from "./athlete-habits";

describe("weighted athlete habit scoring", () => {
  it("computes deterministic weighted category scores", () => {
    const summary = getHabitScoreSummary({
      extraTouches: true,
      weakFoot: false,
      tacticalLearning: true,
      stretching: true,
      mobility: false,
      recoverySession: true,
      hydration: true,
      nutrition: false,
      sleepBeforeMidnight: false
    });

    expect(summary).toMatchObject({
      score: 56.7,
      recoveryScore: 66.7,
      strongestGapKey: "weakFoot",
      scorerVersion: HABIT_SCORE_VERSION
    });
    expect(summary.categories).toEqual([
      { key: "training", completed: 1, total: 2, weight: 0.4, contribution: 20 },
      { key: "recovery", completed: 2, total: 3, weight: 0.3, contribution: 20 },
      { key: "wellness", completed: 1, total: 3, weight: 0.2, contribution: 6.7 },
      { key: "learning", completed: 1, total: 1, weight: 0.1, contribution: 10 }
    ]);
  });

  it("ignores unknown keys instead of creating an unversioned scoring path", () => {
    const normalized = normalizeHabitStatuses({
      extraTouches: true,
      localUnsupportedHabit: true
    });

    expect(normalized).not.toHaveProperty("localUnsupportedHabit");
    expect(getHabitScoreSummary(normalized).score).toBe(20);
  });
});
