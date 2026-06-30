import { describe, expect, it } from "vitest";
import { resolveTaskDescriptionKey, habitDescriptionDef } from "./daily-plan-copy";
import { selectCopyKey } from "./copy-variants";

const habitTask = { id: "habit:recoverySession", category: "habit", descriptionKey: "athleteiq.dailyPlan.tasks.habit.description" };
const setupTask = { id: "setup:complete-check-in", category: "setup", descriptionKey: "athleteiq.dailyPlan.tasks.completeCheckIn.description" };

describe("daily-plan copy resolution (#intelligent-copy)", () => {
  it("never returns the old generic key for a habit task", () => {
    const key = resolveTaskDescriptionKey(habitTask, { now: Date.parse("2026-06-29T20:00:00"), seed: "a1" });
    expect(key).not.toBe("athleteiq.dailyPlan.tasks.habit.description");
    expect(key.startsWith("athleteiq.dailyPlan.habits.recoverySession.")).toBe(true);
  });

  it("only ever uses THIS habit's own variants (no shared line across cards)", () => {
    const key = resolveTaskDescriptionKey(habitTask, { now: Date.parse("2026-06-29T20:00:00"), seed: "a1" });
    expect([
      "athleteiq.dailyPlan.habits.recoverySession.description",
      "athleteiq.dailyPlan.habits.recoverySession.descriptionB",
      "athleteiq.dailyPlan.habits.recoverySession.descriptionC",
    ]).toContain(key);
  });

  it("different habits resolve to different keyspaces — cards never collapse to one line", () => {
    const ctx = { now: Date.parse("2026-06-29T20:00:00"), seed: "a1" };
    const a = selectCopyKey(habitDescriptionDef("stretching"), ctx);
    const b = selectCopyKey(habitDescriptionDef("hydration"), ctx);
    expect(a.startsWith("athleteiq.dailyPlan.habits.stretching.")).toBe(true);
    expect(b.startsWith("athleteiq.dailyPlan.habits.hydration.")).toBe(true);
    expect(a).not.toBe(b);
  });

  it("rotates a habit's wording across days", () => {
    const keys = new Set(
      Array.from({ length: 14 }, (_, d) =>
        selectCopyKey(habitDescriptionDef("mobility"), {
          now: Date.parse(`2026-07-${String(1 + d).padStart(2, "0")}T09:00:00`),
          seed: "a1",
        })
      )
    );
    expect(keys.size).toBeGreaterThan(1);
  });

  it("passes non-habit tasks through unchanged", () => {
    const key = resolveTaskDescriptionKey(setupTask, { now: Date.parse("2026-06-29T09:00:00"), seed: "a1" });
    expect(key).toBe("athleteiq.dailyPlan.tasks.completeCheckIn.description");
  });
});
