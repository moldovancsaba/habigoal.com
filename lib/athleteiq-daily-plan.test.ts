import { describe, expect, it } from "vitest";
import { POST as generatePlan } from "@/app/api/athleteiq/daily-plan/generate/route";
import { PATCH as patchTask } from "@/app/api/athleteiq/daily-plan/tasks/[id]/route";
import { buildDailyPlan } from "@/lib/athleteiq-daily-plan";
import type { DailyIqSnapshot } from "@/types/athleteiq-daily-iq";
import type { MentalEdgeSnapshot } from "@/types/athleteiq-mental-edge";
import type { PainGuardrail } from "@/types/athleteiq-pain-safety";

describe("AthleteIQ daily plan contract", () => {
  it("adds safety tasks first and blocks high intensity under pain guardrail", () => {
    const plan = buildDailyPlan({
      athleteId: "athlete-1",
      localDate: "2026-06-26",
      timezone: "UTC",
      dailyIq: dailyIq(88, "high"),
      mentalEdge: mentalEdge(),
      painGuardrail: painGuardrail("capped"),
      habitRecord: null
    }, new Date("2026-06-26T12:00:00.000Z"));

    expect(plan.tasks[0]).toMatchObject({ id: "safety:pain-guardrail", priority: "critical" });
    expect(plan.tasks.length).toBeLessThanOrEqual(7);
    expect(plan.recommendation).toMatchObject({
      intensity: "recovery",
      blockedByPainGuardrail: true
    });
  });

  it("preserves completed task state across regeneration when the task remains valid", () => {
    const previousPlan = buildDailyPlan({
      athleteId: "athlete-1",
      localDate: "2026-06-26",
      timezone: "UTC",
      dailyIq: dailyIq(72, "medium"),
      mentalEdge: mentalEdge(),
      painGuardrail: painGuardrail("none"),
      habitRecord: null
    });
    previousPlan.tasks[0].completionState = "completed";

    const regenerated = buildDailyPlan({
      athleteId: "athlete-1",
      localDate: "2026-06-26",
      timezone: "UTC",
      dailyIq: dailyIq(72, "medium"),
      mentalEdge: mentalEdge(),
      painGuardrail: painGuardrail("none"),
      habitRecord: null,
      previousPlan
    });

    expect(regenerated.tasks.find((task) => task.id === previousPlan.tasks[0].id)?.completionState).toBe("completed");
  });

  it("uses conservative setup prompt before Daily IQ exists", () => {
    const plan = buildDailyPlan({
      athleteId: "athlete-1",
      localDate: "2026-06-26",
      timezone: "UTC",
      dailyIq: null,
      mentalEdge: null,
      painGuardrail: painGuardrail("monitor"),
      habitRecord: null
    });

    expect(plan.tasks.map((task) => task.id)).toContain("setup:complete-check-in");
    expect(plan.recommendation.intensity).toBe("low");
    expect(plan.missingData).toContain("daily_iq");
  });
});

describe("AthleteIQ daily plan API validation", () => {
  it("validates athlete id before plan generation", async () => {
    const response = await generatePlan(new Request("http://localhost/api/athleteiq/daily-plan/generate", {
      method: "POST",
      body: JSON.stringify({})
    }));
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.code).toBe("VALIDATION_ERROR");
    expect(payload.correlationId).toMatch(/^aiq-/);
  });

  it("validates task completion state before persistence access", async () => {
    const response = await patchTask(new Request("http://localhost/api/athleteiq/daily-plan/tasks/task-1", {
      method: "PATCH",
      body: JSON.stringify({ athleteId: "athlete-1", localDate: "2026-06-26", completionState: "invalid" })
    }), { params: Promise.resolve({ id: "task-1" }) });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.code).toBe("VALIDATION_ERROR");
    expect(payload.correlationId).toMatch(/^aiq-/);
  });
});

function dailyIq(score: number, confidence: DailyIqSnapshot["confidence"]): DailyIqSnapshot {
  return {
    calculationId: "calc-1",
    athleteId: "athlete-1",
    localDate: "2026-06-26",
    timezone: "UTC",
    mode: "performance",
    dailyIqScore: score,
    readinessScore: score,
    mentalEdgeScore: score,
    habitScore: null,
    safeLoadScore: null,
    painRiskLevel: "none",
    confidence,
    dataUsed: ["checkIn", "moduleRegistry"],
    missingData: [],
    explanation: [],
    algorithmVersion: "test",
    moduleRegistryVersion: "test",
    componentWeights: { readiness: 0.4, mentalEdge: 0.3, habit: 0.2, safeLoad: 0.1 },
    painCapApplied: null,
    highIntensityBlocked: false,
    createdAt: "2026-06-26T12:00:00.000Z"
  };
}

function mentalEdge(): MentalEdgeSnapshot {
  return {
    athleteId: "athlete-1",
    localDate: "2026-06-26",
    timezone: "UTC",
    score: 55,
    riskLevel: "watch",
    trend: "steady",
    routines: [{ routineId: "breathing-reset", labelKey: "routine", reasonCode: "stress_support", estimatedMinutes: 3, completed: false }],
    alertCandidate: null,
    privateFieldsExcluded: ["reflectionBody"],
    dataUsed: ["daily_check_ins"],
    missingData: [],
    sourceLabels: {},
    algorithmVersion: "test",
    generatedAt: "2026-06-26T12:00:00.000Z"
  };
}

function painGuardrail(state: PainGuardrail["state"]): PainGuardrail {
  return {
    athleteId: "athlete-1",
    localDate: "2026-06-26",
    state,
    riskLevel: state === "none" ? "none" : "high",
    maxTrainingIntensity: state === "none" ? "normal" : state === "monitor" ? "low" : "recovery",
    dailyIqCap: state === "none" || state === "monitor" ? null : 60,
    requiredCopyKey: "copy",
    reasonCodes: state === "none" ? [] : ["pain_guardrail"],
    dataUsed: ["daily_check_ins"],
    missingData: [],
    generatedAt: "2026-06-26T12:00:00.000Z"
  };
}
