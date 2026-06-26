import { describe, expect, it } from "vitest";
import { GET as getCoachAlerts } from "@/app/api/athleteiq/coach/mental-alerts/route";
import { POST as completeRoutine } from "@/app/api/athleteiq/mental-edge/routines/[routineId]/complete/route";
import { buildAthleteIqCheckInSnapshot } from "@/lib/athleteiq-check-in";
import {
  ATHLETEIQ_MENTAL_EDGE_ALGORITHM_VERSION,
  buildMentalEdgeSnapshot,
  computeMentalEdgeScore,
  hasExtremeMentalThreshold
} from "@/lib/athleteiq-mental-edge";
import type { AthleteIqCheckInSnapshot } from "@/types/athleteiq-check-in";

describe("AthleteIQ Mental Edge contract", () => {
  it("scores positive mental fields and inverted stress", () => {
    const snapshot = createCheckIn("2026-06-26", { mood: 8, stress: 3, motivation: 7, confidence: 6, focus: 8 });

    expect(computeMentalEdgeScore(snapshot)).toBe(71.4);
  });

  it("creates a moderate coach alert when low pattern repeats in two of three days", () => {
    const recent = [
      createCheckIn("2026-06-24", { mood: 3, stress: 8, motivation: 3, confidence: 3, focus: 3 }),
      createCheckIn("2026-06-25", { mood: 7, stress: 4, motivation: 7, confidence: 7, focus: 7 }),
      createCheckIn("2026-06-26", { mood: 3, stress: 8, motivation: 3, confidence: 3, focus: 3 })
    ];

    const snapshot = buildMentalEdgeSnapshot({
      athleteId: "athlete-1",
      localDate: "2026-06-26",
      timezone: "UTC",
      today: recent[2],
      recent,
      completedRoutineIds: []
    });

    expect(snapshot.algorithmVersion).toBe(ATHLETEIQ_MENTAL_EDGE_ALGORITHM_VERSION);
    expect(snapshot.riskLevel).toBe("concern");
    expect(snapshot.alertCandidate).toMatchObject({
      severity: "moderate",
      reasonCodes: ["low_score_today", "low_pattern_two_of_three"],
      privateFieldsExcluded: ["reflectionBody"]
    });
    expect(snapshot.routines.map((routine) => routine.routineId)).toContain("coach-check-in");
  });

  it("creates a high alert candidate on extreme thresholds", () => {
    const today = createCheckIn("2026-06-26", { mood: 2, stress: 9, motivation: 5, confidence: 5, focus: 5 });
    const snapshot = buildMentalEdgeSnapshot({
      athleteId: "athlete-1",
      localDate: "2026-06-26",
      timezone: "UTC",
      today,
      recent: [today],
      completedRoutineIds: ["breathing-reset"]
    });

    expect(hasExtremeMentalThreshold(today)).toBe(true);
    expect(snapshot.riskLevel).toBe("urgent");
    expect(snapshot.alertCandidate?.severity).toBe("high");
    expect(snapshot.routines.find((routine) => routine.routineId === "breathing-reset")?.completed).toBe(true);
  });

  it("suppresses alerts and marks missing signals when no mental check-in exists", () => {
    const snapshot = buildMentalEdgeSnapshot({
      athleteId: "athlete-1",
      localDate: "2026-06-26",
      timezone: "UTC",
      today: null,
      recent: [],
      completedRoutineIds: []
    });

    expect(snapshot.score).toBeNull();
    expect(snapshot.riskLevel).toBe("insufficient");
    expect(snapshot.alertCandidate).toBeNull();
    expect(snapshot.privateFieldsExcluded).toEqual(["reflectionBody"]);
    expect(snapshot.missingData).toContain("reflectionTone");
  });
});

describe("AthleteIQ Mental Edge API validation", () => {
  it("returns structured validation errors for unknown routines before persistence", async () => {
    const response = await completeRoutine(
      new Request("http://localhost/api/athleteiq/mental-edge/routines/unknown/complete", {
        method: "POST",
        body: JSON.stringify({ athleteId: "athlete-1" })
      }),
      { params: Promise.resolve({ routineId: "unknown" }) }
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.code).toBe("VALIDATION_ERROR");
    expect(payload.correlationId).toMatch(/^aiq-/);
  });

  it("validates coach alert team id before persistence access", async () => {
    const response = await getCoachAlerts(new Request("http://localhost/api/athleteiq/coach/mental-alerts"));
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.code).toBe("VALIDATION_ERROR");
    expect(payload.correlationId).toMatch(/^aiq-/);
  });
});

function createCheckIn(localDate: string, values: Record<string, unknown>) {
  const result = buildAthleteIqCheckInSnapshot({
    athleteId: "athlete-1",
    mode: "performance",
    timezone: "UTC",
    values: {
      sleepQuality: 7,
      fatigue: 4,
      pain: 1,
      stress: 4,
      mood: 6,
      motivation: 6,
      confidence: 6,
      focus: 6,
      ...values
    }
  }, new Date(`${localDate}T12:00:00.000Z`));

  return { ...result.snapshot!, id: `check-in-${localDate}`, localDate } satisfies AthleteIqCheckInSnapshot;
}
