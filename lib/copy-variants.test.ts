import { describe, expect, it } from "vitest";
import {
  selectCopyKey,
  deriveTimeOfDay,
  hasStreak,
  isEvening,
  lowConfidence,
  type CopyDef,
} from "./copy-variants";

const MORNING = Date.parse("2026-06-29T08:00:00");
const EVENING = Date.parse("2026-06-29T20:00:00");

const def: CopyDef = {
  id: "habit.keepGoing",
  variants: [
    { key: "neutralA" },
    { key: "neutralB" },
    { key: "neutralC" },
    { key: "evening", when: isEvening },
    { key: "streak7", when: hasStreak(7) },
    { key: "lowData", when: lowConfidence },
  ],
};

describe("copy variant engine (#intelligent-copy)", () => {
  it("derives time of day from the clock", () => {
    expect(deriveTimeOfDay(Date.parse("2026-06-29T03:00:00"))).toBe("night");
    expect(deriveTimeOfDay(MORNING)).toBe("morning");
    expect(deriveTimeOfDay(Date.parse("2026-06-29T14:00:00"))).toBe("afternoon");
    expect(deriveTimeOfDay(EVENING)).toBe("evening");
  });

  it("prefers a context-matched variant over neutral rotation", () => {
    const key = selectCopyKey(def, { now: EVENING, seed: "a1" });
    // evening matches; with no streak/low-data it should be the evening line
    expect(key).toBe("evening");
  });

  it("rotates among multiple matched conditions deterministically", () => {
    // evening + 7-day streak both match → one of the two, stable for the day
    const ctx = { now: EVENING, seed: "a1", streakDays: 9 };
    const first = selectCopyKey(def, ctx);
    const second = selectCopyKey(def, ctx);
    expect(first).toBe(second);
    expect(["evening", "streak7"]).toContain(first);
  });

  it("falls back to neutral daily rotation when nothing matches", () => {
    const key = selectCopyKey(def, { now: MORNING, seed: "a1" });
    expect(["neutralA", "neutralB", "neutralC"]).toContain(key);
  });

  it("is deterministic for the same day + seed, and varies across days", () => {
    const day1 = selectCopyKey(def, { now: MORNING, seed: "a1" });
    const day1again = selectCopyKey(def, { now: Date.parse("2026-06-29T09:30:00"), seed: "a1" });
    expect(day1).toBe(day1again); // same calendar day → same wording
    const keysAcrossDays = new Set(
      Array.from({ length: 14 }, (_, d) =>
        selectCopyKey(def, { now: Date.parse(`2026-07-${String(1 + d).padStart(2, "0")}T09:00:00`), seed: "a1" })
      )
    );
    expect(keysAcrossDays.size).toBeGreaterThan(1); // wording changes over time
  });

  it("different athletes can see different rotations", () => {
    const variety = new Set(
      ["a1", "a2", "a3", "a4", "a5"].map((seed) => selectCopyKey(def, { now: MORNING, seed }))
    );
    expect(variety.size).toBeGreaterThan(1);
  });
});
