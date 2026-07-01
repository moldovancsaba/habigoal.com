import { describe, expect, it } from "vitest";
import completeDay from "../tests/fixtures/operating-score/complete-day.json";
import partialDay from "../tests/fixtures/operating-score/partial-day.json";
import {
  OPERATING_SCORE_VERSION,
  buildDailyOperatingMetric,
  buildDailyOperatingMetrics,
  getReadinessZone,
  scoreTrainingLoad
} from "./operating-score";
import type { AssessmentRecord } from "@/types/assessment";
import type { HabitRecord } from "@/types/habit-record";

describe("daily operating score contract", () => {
  it("scores a complete athlete operating day deterministically", () => {
    const metric = buildDailyOperatingMetric({
      athleteId: completeDay.athleteId,
      assessment: completeDay.assessment as AssessmentRecord,
      habitRecord: completeDay.habitRecord as HabitRecord
    });

    expect(metric).toMatchObject({
      athleteId: completeDay.athleteId,
      date: completeDay.assessment.session.date,
      scoreVersion: OPERATING_SCORE_VERSION,
      athleteIqScore: completeDay.expected.athleteIqScore,
      readinessScore: completeDay.expected.readinessScore,
      habitScore: completeDay.expected.habitScore,
      recoveryScore: completeDay.expected.recoveryScore,
      trainingLoadPoints: completeDay.expected.trainingLoadPoints,
      trainingLoadScore: completeDay.expected.trainingLoadScore,
      performanceScore: completeDay.expected.performanceScore,
      readinessZone: completeDay.expected.readinessZone,
      sourceCompleteness: {
        checkIn: true,
        habits: true,
        recovery: true,
        trainingLoad: true,
        performance: true
      }
    });
  });

  it("keeps partial-source days explicit without fabricating fallback data", () => {
    const metric = buildDailyOperatingMetric({
      athleteId: partialDay.athleteId,
      assessment: partialDay.assessment as AssessmentRecord
    });

    expect(metric).toMatchObject({
      athleteId: partialDay.athleteId,
      date: partialDay.assessment.session.date,
      athleteIqScore: partialDay.expected.athleteIqScore,
      readinessScore: partialDay.expected.readinessScore,
      habitScore: partialDay.expected.habitScore,
      recoveryScore: partialDay.expected.recoveryScore,
      trainingLoadPoints: partialDay.expected.trainingLoadPoints,
      trainingLoadScore: partialDay.expected.trainingLoadScore,
      performanceScore: partialDay.expected.performanceScore,
      readinessZone: partialDay.expected.readinessZone,
      sourceCompleteness: {
        checkIn: true,
        habits: false,
        recovery: true,
        trainingLoad: false,
        performance: true
      }
    });
  });

  it("leaves trainingLoadAcwr null with fewer than 14 prior load points", () => {
    const metric = buildDailyOperatingMetric({
      athleteId: completeDay.athleteId,
      assessment: completeDay.assessment as AssessmentRecord,
      priorLoadPoints: [300, 310, 320]
    });
    expect(metric.trainingLoadAcwr).toBeNull();
    expect(metric.trainingLoadScore).toBe(completeDay.expected.trainingLoadScore);
  });

  it("penalizes an acute training-load spike (ACWR > 1.5) once enough history exists", () => {
    // 15 low-load baseline days, then the last 6 prior days already ramped up to
    // today's 350-pt level: the trailing-7 acute average sits well above the
    // trailing-28 chronic average (baseline-weighted).
    const priorLoadPoints = [...Array.from({ length: 15 }, () => 100), ...Array.from({ length: 6 }, () => 350)];
    const metric = buildDailyOperatingMetric({
      athleteId: completeDay.athleteId,
      assessment: completeDay.assessment as AssessmentRecord,
      priorLoadPoints
    });
    expect(metric.trainingLoadAcwr).toBeGreaterThan(1.5);
    expect(metric.trainingLoadScore).toBe(Math.max(0, (completeDay.expected.trainingLoadScore as number) - 15));
  });

  it("penalizes a detraining dip (ACWR < 0.8) once enough history exists", () => {
    // 15 high-load baseline days, then the last 6 prior days already tapered to
    // today's lighter 350-pt level.
    const priorLoadPoints = [...Array.from({ length: 15 }, () => 700), ...Array.from({ length: 6 }, () => 350)];
    const metric = buildDailyOperatingMetric({
      athleteId: completeDay.athleteId,
      assessment: completeDay.assessment as AssessmentRecord,
      priorLoadPoints
    });
    expect(metric.trainingLoadAcwr).toBeLessThan(0.8);
    expect(metric.trainingLoadScore).toBe(Math.max(0, (completeDay.expected.trainingLoadScore as number) - 10));
  });

  it("leaves the score unrefined when ACWR is within the stable range", () => {
    const priorLoadPoints = Array.from({ length: 28 }, () => 350);
    const metric = buildDailyOperatingMetric({
      athleteId: completeDay.athleteId,
      assessment: completeDay.assessment as AssessmentRecord,
      priorLoadPoints
    });
    expect(metric.trainingLoadAcwr).toBeCloseTo(1, 1);
    expect(metric.trainingLoadScore).toBe(completeDay.expected.trainingLoadScore);
  });

  it("sorts metrics chronologically and joins habit records by exact date", () => {
    const metrics = buildDailyOperatingMetrics({
      athleteId: completeDay.athleteId,
      assessments: [partialDay.assessment as AssessmentRecord, completeDay.assessment as AssessmentRecord],
      habitRecords: [completeDay.habitRecord as HabitRecord]
    });

    expect(metrics.map((metric) => metric.date)).toEqual(["2026-05-20", "2026-05-21"]);
    expect(metrics[0].habitScore).toBe(completeDay.expected.habitScore);
    expect(metrics[1].habitScore).toBeNull();
  });
});

describe("operating score utility thresholds", () => {
  it("classifies daily load ranges", () => {
    expect(scoreTrainingLoad(null)).toBeNull();
    expect(scoreTrainingLoad(0)).toBe(40);
    expect(scoreTrainingLoad(120)).toBe(55);
    expect(scoreTrainingLoad(350)).toBe(90);
    expect(scoreTrainingLoad(650)).toBe(75);
    expect(scoreTrainingLoad(900)).toBe(50);
  });

  it("classifies readiness zones", () => {
    expect(getReadinessZone(null)).toBe("unknown");
    expect(getReadinessZone(90)).toBe("peak");
    expect(getReadinessZone(70)).toBe("good");
    expect(getReadinessZone(55)).toBe("moderate");
    expect(getReadinessZone(40)).toBe("fatigued");
    expect(getReadinessZone(20)).toBe("recovery");
  });
});
