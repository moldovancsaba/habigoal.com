import { describe, expect, it } from "vitest";
import { classifyReadinessTone, normalizeThresholds, DEFAULT_COACH_THRESHOLDS } from "./coach-thresholds";

describe("coach thresholds (GH-525 P0)", () => {
  it("classifies with defaults", () => {
    const t = DEFAULT_COACH_THRESHOLDS;
    expect(classifyReadinessTone(4.2, t)).toBe("green");
    expect(classifyReadinessTone(3, t)).toBe("yellow");
    expect(classifyReadinessTone(2, t)).toBe("red");
  });

  it("respects custom thresholds", () => {
    const t = { greenMin: 3.5, yellowMin: 2 };
    expect(classifyReadinessTone(3.5, t)).toBe("green");
    expect(classifyReadinessTone(2.5, t)).toBe("yellow");
    expect(classifyReadinessTone(1.9, t)).toBe("red");
  });

  it("normalizes + clamps and rejects inverted bands", () => {
    expect(normalizeThresholds({ greenMin: 4, yellowMin: 2.5 })).toEqual({ greenMin: 4, yellowMin: 2.5 });
    expect(normalizeThresholds({ greenMin: 9, yellowMin: -3 })).toEqual({ greenMin: 5, yellowMin: 0 });
    expect(normalizeThresholds({ greenMin: 2, yellowMin: 3 })).toBeNull(); // inverted
    expect(normalizeThresholds({ greenMin: "x", yellowMin: 2 })).toBeNull();
  });
});
