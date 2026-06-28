import { describe, expect, it } from "vitest";
import { applyPainRule, buildFmsScreen, computeFmsComposite, hasAnyPainFlag, validateFmsScores } from "@/lib/athleteiq-fms";
import { FMS_SUBTESTS, type FmsScores } from "@/types/athleteiq-fms";

function fullScores(value = 2): FmsScores {
  return FMS_SUBTESTS.reduce((acc, subtest) => ({ ...acc, [subtest]: value }), {} as FmsScores);
}

describe("validateFmsScores", () => {
  it("accepts a complete set of integer scores in 0..3", () => {
    expect(validateFmsScores(fullScores(3))).toEqual([]);
    expect(validateFmsScores(fullScores(0))).toEqual([]);
  });

  it("rejects missing sub-tests", () => {
    const errors = validateFmsScores({ deepSquat: 2 });
    expect(errors.some((e) => e.includes("hurdleStep"))).toBe(true);
  });

  it("rejects out-of-range or non-integer scores", () => {
    expect(validateFmsScores({ ...fullScores(2), deepSquat: 4 }).some((e) => e.includes("deepSquat must be between 0 and 3"))).toBe(true);
    expect(validateFmsScores({ ...fullScores(2), rotaryStability: 1.5 }).some((e) => e.includes("rotaryStability must be an integer"))).toBe(true);
  });
});

describe("computeFmsComposite + pain rule", () => {
  it("sums all sub-tests when there is no pain", () => {
    expect(computeFmsComposite(fullScores(3), {})).toBe(21);
    expect(computeFmsComposite(fullScores(2), {})).toBe(14);
  });

  it("forces a painful sub-test to 0", () => {
    const scores = fullScores(3); // would be 21
    const composite = computeFmsComposite(scores, { deepSquat: true });
    expect(composite).toBe(18);
    expect(applyPainRule(scores, { deepSquat: true }).deepSquat).toBe(0);
  });

  it("detects any pain flag", () => {
    expect(hasAnyPainFlag({})).toBe(false);
    expect(hasAnyPainFlag({ hurdleStep: true })).toBe(true);
  });
});

describe("buildFmsScreen", () => {
  it("persists pain-adjusted scores, the computed composite and trimmed notes", () => {
    const screen = buildFmsScreen({
      athleteId: "a1",
      date: "2026-06-28",
      scores: fullScores(3),
      painFlags: { rotaryStability: true },
      notes: "  watch the right knee  ",
      recordedBy: "physio@example.com",
      now: new Date("2026-06-28T09:00:00.000Z")
    });
    expect(screen.composite).toBe(18);
    expect(screen.scores.rotaryStability).toBe(0);
    expect(screen.painFlags.rotaryStability).toBe(true);
    expect(screen.notes).toBe("watch the right knee");
    expect(screen.recordedBy).toBe("physio@example.com");
    expect(screen.createdAt).toBe("2026-06-28T09:00:00.000Z");
  });
});
