import { describe, expect, it } from "vitest";
import { GET as getHistory } from "@/app/api/athleteiq/daily-iq/history/route";
import { POST as recalculate } from "@/app/api/athleteiq/daily-iq/recalculate/route";
import { getHabitScoreSummary } from "@/lib/athlete-habits";
import { buildAthleteIqCheckInSnapshot } from "@/lib/athleteiq-check-in";
import {
  ATHLETEIQ_DAILY_IQ_ALGORITHM_VERSION,
  DAILY_IQ_WEIGHTS,
  buildDailyIqSnapshot,
  computeMentalEdgeScore,
  computeRecoverySupportScore,
  computeReadinessScore,
  projectDailyIqSnapshotForRole
} from "@/lib/athleteiq-daily-iq";
import type { AthleteIqCheckInSnapshot } from "@/types/athleteiq-check-in";
import type { HabitRecord } from "@/types/habit-record";

describe("AthleteIQ Daily IQ scoring contract", () => {
  it("computes transparent component scores, confidence, and pain caps", () => {
    const checkIn = createCheckIn({
      sleepQuality: 8,
      fatigue: 4,
      pain: 8,
      stress: 3,
      mood: 7,
      confidence: 6,
      focus: 8,
      motivation: 7,
      trainingLoad: 350
    });
    const habitRecord = createHabitRecord({ hydration: true, nutrition: true, sleepBeforeMidnight: true, stretching: true, mobility: true, recoverySession: true });
    const snapshot = buildDailyIqSnapshot({
      athleteId: "athlete-1",
      localDate: "2026-06-26",
      timezone: "Europe/Budapest",
      mode: "performance",
      checkInSnapshot: checkIn,
      habitRecord,
      trainingLoadRecords: [],
      moduleRegistryVersion: "aiq-modules-test"
    }, new Date("2026-06-26T12:00:00.000Z"));

    expect(snapshot.algorithmVersion).toBe(ATHLETEIQ_DAILY_IQ_ALGORITHM_VERSION);
    expect(snapshot.readinessScore).toBe(72.5);
    expect(snapshot.mentalEdgeScore).toBe(69.2);
    expect(snapshot.habitScore).toBe(getHabitScoreSummary(habitRecord.statuses).score);
    expect(snapshot.safeLoadScore).toBe(90);
    expect(snapshot.recoverySupportScore).toBe(25);
    expect(snapshot.confidence).toBe("high");
    expect(snapshot.painRiskLevel).toBe("high");
    expect(snapshot.dailyIqScore).toBe(60);
    expect(snapshot.highIntensityBlocked).toBe(true);
    expect(snapshot.missingData).toEqual([]);
    expect(snapshot.componentWeights).toEqual(DAILY_IQ_WEIGHTS);
  });

  it("returns insufficient confidence with no check-in and no numeric composite", () => {
    const snapshot = buildDailyIqSnapshot({
      athleteId: "athlete-1",
      localDate: "2026-06-26",
      timezone: "UTC",
      mode: "performance",
      checkInSnapshot: null,
      habitRecord: null,
      trainingLoadRecords: [],
      moduleRegistryVersion: "aiq-modules-test"
    });

    expect(snapshot.dailyIqScore).toBeNull();
    expect(snapshot.confidence).toBe("insufficient");
    expect(snapshot.missingData).toEqual(["checkIn", "habits", "sessionLoad", "recoverySupport"]);
  });

  it("keeps readiness and mental edge calculations independently explainable", () => {
    const checkIn = createCheckIn({ sleepQuality: 10, fatigue: 1, pain: 1, stress: 1, mood: 10, confidence: 10, focus: 10, motivation: 10, sleepHours: 8, sorenessAreas: [] });

    expect(computeReadinessScore(checkIn)).toBe(100);
    expect(computeMentalEdgeScore(checkIn)).toBe(100);
    expect(computeRecoverySupportScore(checkIn)).toBe(100);
  });

  it("redacts mental and pain details for non-clinical family projections", () => {
    const snapshot = buildDailyIqSnapshot({
      athleteId: "athlete-1",
      localDate: "2026-06-26",
      timezone: "UTC",
      mode: "performance",
      checkInSnapshot: createCheckIn({ sleepQuality: 7, fatigue: 4, pain: 6, stress: 4, mood: 6 }),
      habitRecord: null,
      trainingLoadRecords: [],
      moduleRegistryVersion: "aiq-modules-test"
    });

    const projected = projectDailyIqSnapshotForRole(snapshot, { role: "parent" });

    expect(projected.mentalEdgeScore).toBeNull();
    expect(projected.painRiskLevel).toBe("redacted");
    expect(projected.redactions).toEqual(["mentalEdgeScore", "painRiskLevel"]);
  });
});

describe("AthleteIQ Daily IQ API validation", () => {
  it("returns structured validation errors before recalculation persistence", async () => {
    const response = await recalculate(new Request("http://localhost/api/athleteiq/daily-iq/recalculate", {
      method: "POST",
      body: JSON.stringify({ mode: "performance" })
    }));
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toMatchObject({
      code: "VALIDATION_ERROR",
      messageKey: "athleteiq.errors.VALIDATION_ERROR",
      retryable: false
    });
    expect(payload.correlationId).toMatch(/^aiq-/);
  });

  it("validates history date range before persistence access", async () => {
    const response = await getHistory(new Request("http://localhost/api/athleteiq/daily-iq/history?athleteId=athlete-1&from=2026-06-27&to=2026-06-26"));
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.code).toBe("VALIDATION_ERROR");
    expect(payload.correlationId).toMatch(/^aiq-/);
  });
});

function createCheckIn(values: Record<string, unknown>) {
  const result = buildAthleteIqCheckInSnapshot({
    athleteId: "athlete-1",
    mode: "performance",
    timezone: "UTC",
    values: {
      sleepQuality: 7,
      fatigue: 4,
      pain: 2,
      stress: 4,
      mood: 6,
      ...values
    }
  }, new Date("2026-06-26T12:00:00.000Z"));

  return { ...result.snapshot!, id: "check-in-1" } satisfies AthleteIqCheckInSnapshot;
}

function createHabitRecord(statuses: Record<string, boolean>): HabitRecord {
  return {
    athleteId: "athlete-1",
    date: "2026-06-26",
    statuses,
    createdAt: "2026-06-26T12:00:00.000Z",
    updatedAt: "2026-06-26T12:00:00.000Z"
  };
}
