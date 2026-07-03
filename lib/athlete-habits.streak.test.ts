import { describe, expect, it } from "vitest";
import {
  atLeastOneHabitCompleted,
  computeBestStreak,
  computeCurrentStreak,
  majorityHabitsCompleted,
  type DayRecordLike
} from "@/lib/athlete-habits";

// Build a day record with `n` habits completed (out of the 9 canonical keys).
function day(date: string, completed: number): DayRecordLike {
  const keys = [
    "extraTouches", "weakFoot", "tacticalLearning", "stretching", "mobility",
    "recoverySession", "hydration", "nutrition", "sleepBeforeMidnight"
  ];
  const statuses: Record<string, boolean> = {};
  keys.forEach((k, i) => { statuses[k] = i < completed; });
  return { date, statuses };
}

describe("computeCurrentStreak (GH-426)", () => {
  it("reproduces the reported scenario: two consecutive active days are a streak of 2, not 0", () => {
    // Chart showed 27 & 28 active (>=1 habit), 22-26 inactive; today = 28.
    const records = [day("2026-06-27", 1), day("2026-06-28", 1)];
    expect(computeCurrentStreak(records, "2026-06-28", atLeastOneHabitCompleted)).toBe(2);
  });

  it("counts a single active habit as qualifying (matches the consumer copy)", () => {
    expect(computeCurrentStreak([day("2026-06-28", 1)], "2026-06-28")).toBe(1);
  });

  it("breaks on a calendar gap (missing day is not part of the run)", () => {
    const records = [day("2026-06-22", 5), day("2026-06-28", 5)]; // 6-day gap
    expect(computeCurrentStreak(records, "2026-06-28")).toBe(1);
  });

  it("anchors at yesterday when today is not yet logged", () => {
    const records = [day("2026-06-26", 2), day("2026-06-27", 2)];
    expect(computeCurrentStreak(records, "2026-06-28")).toBe(2);
  });

  it("anchors at yesterday when today is logged but no habit was completed", () => {
    const records = [day("2026-06-27", 2), day("2026-06-28", 0)];
    expect(computeCurrentStreak(records, "2026-06-28")).toBe(1);
  });

  it("returns 0 for an empty history", () => {
    expect(computeCurrentStreak([], "2026-06-28")).toBe(0);
  });

  it("returns 0 when the most recent activity is older than yesterday", () => {
    expect(computeCurrentStreak([day("2026-06-20", 3)], "2026-06-28")).toBe(0);
  });
});

describe("computeBestStreak (GH-426)", () => {
  it("finds the longest consecutive run, ignoring gaps", () => {
    const records = [
      day("2026-06-01", 1), day("2026-06-02", 1), day("2026-06-03", 1), // run of 3
      day("2026-06-10", 1), day("2026-06-11", 1) // run of 2
    ];
    expect(computeBestStreak(records, atLeastOneHabitCompleted)).toBe(3);
  });

  it("is 0 with no qualifying days", () => {
    expect(computeBestStreak([day("2026-06-01", 0)], atLeastOneHabitCompleted)).toBe(0);
  });
});

describe("streak qualifiers", () => {
  it("atLeastOneHabitCompleted is true for >=1 and false for 0", () => {
    expect(atLeastOneHabitCompleted(day("d", 1))).toBe(true);
    expect(atLeastOneHabitCompleted(day("d", 0))).toBe(false);
  });

  it("majorityHabitsCompleted needs >=70% of 9 (ceil = 7)", () => {
    expect(majorityHabitsCompleted(day("d", 6))).toBe(false);
    expect(majorityHabitsCompleted(day("d", 7))).toBe(true);
  });
});
