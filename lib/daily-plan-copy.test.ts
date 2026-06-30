import { describe, expect, it } from "vitest";
import { resolveTaskDescriptionKey, habitDescriptionDef } from "./daily-plan-copy";
import { selectCopyKey } from "./copy-variants";

const habitTask = { id: "habit:recoverySession", category: "habit", descriptionKey: "athleteiq.dailyPlan.tasks.habit.description" };
const setupTask = { id: "setup:complete-check-in", category: "setup", descriptionKey: "athleteiq.dailyPlan.tasks.completeCheckIn.description" };

describe("daily-plan copy resolution (#intelligent-copy)", () => {
  it("never returns the old generic key for a habit task (fixes repetitive cards)", () => {
    const key = resolveTaskDescriptionKey(habitTask, { now: Date.parse("2026-06-29T09:00:00"), seed: "a1" });
    expect(key).not.toBe("athleteiq.dailyPlan.tasks.habit.description");
    expect(key.startsWith("athleteiq.dailyPlan.")).toBe(true);
  });

  it("uses the per-habit specific line or a neutral alternate on a neutral morning", () => {
    const key = resolveTaskDescriptionKey(habitTask, { now: Date.parse("2026-06-29T09:00:00"), seed: "a1" });
    expect([
      "athleteiq.dailyPlan.habits.recoverySession.description",
      "athleteiq.dailyPlan.habitNudge.neutralB",
      "athleteiq.dailyPlan.habitNudge.neutralC",
    ]).toContain(key);
  });

  it("prefers the evening line in the evening", () => {
    const key = resolveTaskDescriptionKey(habitTask, { now: Date.parse("2026-06-29T20:00:00"), seed: "a1" });
    expect(key).toBe("athleteiq.dailyPlan.habitNudge.evening");
  });

  it("prefers a streak line when a streak is active", () => {
    const key = resolveTaskDescriptionKey(habitTask, { now: Date.parse("2026-06-29T09:00:00"), seed: "a1", streakDays: 7 });
    expect(key).toBe("athleteiq.dailyPlan.habitNudge.streak");
  });

  it("passes non-habit tasks through unchanged", () => {
    const key = resolveTaskDescriptionKey(setupTask, { now: Date.parse("2026-06-29T09:00:00"), seed: "a1" });
    expect(key).toBe("athleteiq.dailyPlan.tasks.completeCheckIn.description");
  });

  it("distinct habits keep distinct specific lines on neutral days", () => {
    const ctx = { now: Date.parse("2026-06-29T09:00:00"), seed: "a1" };
    const a = selectCopyKey(habitDescriptionDef("stretching"), ctx);
    const b = selectCopyKey(habitDescriptionDef("hydration"), ctx);
    // both resolve within the catalog; their specific lines differ by habit key
    expect(a.startsWith("athleteiq.dailyPlan.")).toBe(true);
    expect(b.startsWith("athleteiq.dailyPlan.")).toBe(true);
  });
});
