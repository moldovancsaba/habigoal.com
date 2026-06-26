import { describe, expect, it } from "vitest";
import { PATCH as patchPainAlert } from "@/app/api/athleteiq/pain-alerts/[id]/route";
import { GET as getPainAlerts } from "@/app/api/athleteiq/pain-alerts/route";
import { buildAthleteIqCheckInSnapshot } from "@/lib/athleteiq-check-in";
import { buildDailyIqSnapshot } from "@/lib/athleteiq-daily-iq";
import {
  ATHLETEIQ_PAIN_SAFETY_ALGORITHM_VERSION,
  evaluatePainSafety,
  getPainSignalFromCheckIn
} from "@/lib/athleteiq-pain-safety";
import type { AthleteIqCheckInSnapshot } from "@/types/athleteiq-check-in";

describe("AthleteIQ pain safety contract", () => {
  it("returns none for pain <= 3", () => {
    const result = evaluatePainSafety({
      athleteId: "athlete-1",
      localDate: "2026-06-26",
      recentPainScores: [{ localDate: "2026-06-26", painScore: 3, locations: [], sessionLoadContext: null }]
    });

    expect(ATHLETEIQ_PAIN_SAFETY_ALGORITHM_VERSION).toBe("aiq-pain-safety-1240.1");
    expect(result.guardrail.state).toBe("none");
    expect(result.guardrail.maxTrainingIntensity).toBe("normal");
    expect(result.alert).toBeUndefined();
  });

  it("caps readiness and creates coach alert for pain >= 7", () => {
    const result = evaluatePainSafety({
      athleteId: "athlete-1",
      localDate: "2026-06-26",
      recentPainScores: [{ localDate: "2026-06-26", painScore: 7, locations: ["knee"], sessionLoadContext: 300 }]
    });

    expect(result.guardrail).toMatchObject({
      state: "capped",
      riskLevel: "high",
      maxTrainingIntensity: "recovery",
      dailyIqCap: 60,
      reasonCodes: ["high_pain_today"]
    });
    expect(result.alert?.locations).toEqual(["knee"]);
  });

  it("escalates pain >= 5 for three days to coach review", () => {
    const result = evaluatePainSafety({
      athleteId: "athlete-1",
      localDate: "2026-06-26",
      recentPainScores: [
        { localDate: "2026-06-24", painScore: 5, locations: [], sessionLoadContext: null },
        { localDate: "2026-06-25", painScore: 6, locations: [], sessionLoadContext: null },
        { localDate: "2026-06-26", painScore: 5, locations: [], sessionLoadContext: null }
      ]
    });

    expect(result.guardrail.state).toBe("coach_review");
    expect(result.guardrail.reasonCodes).toContain("pain_repeated_three_days");
    expect(result.guardrail.dailyIqCap).toBe(60);
  });

  it("aligns Daily IQ high pain cap with pain safety threshold", () => {
    const checkIn = createCheckIn(7);
    const snapshot = buildDailyIqSnapshot({
      athleteId: "athlete-1",
      localDate: "2026-06-26",
      timezone: "UTC",
      mode: "performance",
      checkInSnapshot: checkIn,
      habitRecord: null,
      trainingLoadRecords: [],
      moduleRegistryVersion: "aiq-modules-test"
    });

    expect(getPainSignalFromCheckIn(checkIn).painScore).toBe(7);
    expect(snapshot.painRiskLevel).toBe("high");
    expect(snapshot.painCapApplied).toBe(60);
  });
});

describe("AthleteIQ pain safety API validation", () => {
  it("validates athlete id before listing alerts", async () => {
    const response = await getPainAlerts(new Request("http://localhost/api/athleteiq/pain-alerts"));
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.code).toBe("VALIDATION_ERROR");
    expect(payload.correlationId).toMatch(/^aiq-/);
  });

  it("validates patch state before persistence access", async () => {
    const response = await patchPainAlert(
      new Request("http://localhost/api/athleteiq/pain-alerts/507f1f77bcf86cd799439011", {
        method: "PATCH",
        body: JSON.stringify({ state: "capped" })
      }),
      { params: Promise.resolve({ id: "507f1f77bcf86cd799439011" }) }
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.code).toBe("VALIDATION_ERROR");
    expect(payload.correlationId).toMatch(/^aiq-/);
  });
});

function createCheckIn(pain: number) {
  const result = buildAthleteIqCheckInSnapshot({
    athleteId: "athlete-1",
    mode: "performance",
    timezone: "UTC",
    values: {
      sleepQuality: 8,
      fatigue: 3,
      pain,
      stress: 2,
      mood: 8,
      confidence: 8,
      focus: 8,
      motivation: 8
    }
  }, new Date("2026-06-26T12:00:00.000Z"));

  return { ...result.snapshot!, id: "check-in-1" } satisfies AthleteIqCheckInSnapshot;
}
