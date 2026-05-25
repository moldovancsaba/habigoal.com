import { describe, expect, it } from "vitest";
import {
  buildTrainingLoadSummary,
  classifyWeeklyTrainingLoad,
  computeLoadPoints,
  getMondayDate,
  parseTrainingLoadInput,
  validateTrainingLoadInput
} from "./training-load";
import type { TrainingLoadRecord } from "@/types/training-load";

describe("training load ledger calculations", () => {
  it("computes load points server-side from duration and RPE", () => {
    expect(computeLoadPoints(60, 5)).toBe(300);
    expect(computeLoadPoints(45, null)).toBe(0);
  });

  it("classifies weekly load zones with explicit thresholds", () => {
    expect(classifyWeeklyTrainingLoad(null, 0)).toBe("unknown");
    expect(classifyWeeklyTrainingLoad(0, 0)).toBe("unknown");
    expect(classifyWeeklyTrainingLoad(799, 2)).toBe("under");
    expect(classifyWeeklyTrainingLoad(800, 3)).toBe("optimal");
    expect(classifyWeeklyTrainingLoad(2200, 4)).toBe("optimal");
    expect(classifyWeeklyTrainingLoad(2600, 5)).toBe("heavy");
    expect(classifyWeeklyTrainingLoad(3400, 5)).toBe("risk");
  });

  it("aggregates one athlete week by Monday boundary", () => {
    const records = [
      record("2026-05-18", 300),
      record("2026-05-19", 450),
      record("2026-05-25", 900)
    ];

    expect(getMondayDate("2026-05-24")).toBe("2026-05-18");
    expect(buildTrainingLoadSummary(records, "2026-05-18")).toEqual({
      weekStart: "2026-05-18",
      totalPoints: 750,
      zone: "under",
      records: 2
    });
  });

  it("validates input without substituting fallback values", () => {
    const parsed = parseTrainingLoadInput({
      date: "2026-05-25",
      durationMinutes: 75,
      rpe: 6,
      source: "trainer",
      activityTypes: ["technical", "technical", " recovery "],
      note: "Post-session"
    });

    expect(validateTrainingLoadInput(parsed)).toBe("");
    expect(parsed).toMatchObject({
      date: "2026-05-25",
      durationMinutes: 75,
      rpe: 6,
      source: "trainer",
      activityTypes: ["technical", "recovery"],
      loadPoints: 450
    });
    expect(validateTrainingLoadInput(parseTrainingLoadInput({ date: "bad", durationMinutes: 0 }))).toBe("A valid date is required.");
  });
});

function record(date: string, loadPoints: number): TrainingLoadRecord {
  return {
    athleteId: "fixture-athlete",
    date,
    source: "trainer",
    activityTypes: [],
    durationMinutes: 60,
    rpe: 5,
    loadPoints,
    createdBy: "test",
    createdAt: `${date}T12:00:00.000Z`,
    updatedAt: `${date}T12:00:00.000Z`
  };
}
