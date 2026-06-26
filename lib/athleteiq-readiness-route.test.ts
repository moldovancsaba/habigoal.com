import { describe, expect, it } from "vitest";
import { GET as getTodayRoute } from "@/app/api/athleteiq/readiness-route/today/route";
import { buildReadinessRouteSnapshot, validateReadinessRouteRequest } from "@/lib/athleteiq-readiness-route";
import type { DailyIqSnapshot } from "@/types/athleteiq-daily-iq";
import type { PainGuardrail } from "@/types/athleteiq-pain-safety";

describe("AthleteIQ readiness route engine", () => {
  it("routes high-confidence strong Daily IQ to green", () => {
    const snapshot = buildReadinessRouteSnapshot({
      athleteId: "athlete-1",
      localDate: "2026-06-26",
      timezone: "UTC",
      dailyIq: dailyIq({ readinessScore: 82, dailyIqScore: 80, confidence: "high" }),
      painGuardrail: painGuardrail("none")
    });

    expect(snapshot.route).toBe("green");
    expect(snapshot.action).toBe("full_training_allowed");
    expect(snapshot.allowedActions).toContain("high_intensity_if_planned");
  });

  it("routes moderate pain to amber even with a strong Daily IQ", () => {
    const snapshot = buildReadinessRouteSnapshot({
      athleteId: "athlete-1",
      localDate: "2026-06-26",
      timezone: "UTC",
      dailyIq: dailyIq({ readinessScore: 90, dailyIqScore: 88, confidence: "high" }),
      painGuardrail: painGuardrail("monitor")
    });

    expect(snapshot.route).toBe("amber");
    expect(snapshot.rulesUsed.map((rule) => rule.explanationKey)).toContain("athleteiq.readinessRoute.rules.moderatePainReview");
  });

  it("routes high pain to red regardless of base readiness", () => {
    const snapshot = buildReadinessRouteSnapshot({
      athleteId: "athlete-1",
      localDate: "2026-06-26",
      timezone: "UTC",
      dailyIq: dailyIq({ readinessScore: 90, dailyIqScore: 60, confidence: "high", highIntensityBlocked: true, painCapApplied: 60 }),
      painGuardrail: painGuardrail("capped")
    });

    expect(snapshot.route).toBe("red");
    expect(snapshot.rulesUsed.map((rule) => rule.explanationKey)).toContain("athleteiq.readinessRoute.rules.highPainOverride");
    expect(snapshot.blockedActions).toContain("high_intensity");
  });

  it("uses amber for missing or low-confidence data", () => {
    const snapshot = buildReadinessRouteSnapshot({
      athleteId: "athlete-1",
      localDate: "2026-06-26",
      timezone: "UTC",
      dailyIq: null,
      painGuardrail: null
    });

    expect(snapshot.route).toBe("amber");
    expect(snapshot.confidence).toBe("insufficient");
    expect(snapshot.missingData).toContain("daily_iq");
  });

  it("validates API request contracts before loading sources", async () => {
    expect(validateReadinessRouteRequest({ athleteId: "", localDate: "bad" })).toEqual(["athleteId is required", "localDate must use YYYY-MM-DD"]);
    const response = await getTodayRoute(new Request("http://localhost/api/athleteiq/readiness-route/today?localDate=bad"));
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.code).toBe("VALIDATION_ERROR");
    expect(payload.correlationId).toMatch(/^aiq-/);
  });
});

function dailyIq(overrides: Partial<DailyIqSnapshot>): DailyIqSnapshot {
  return {
    calculationId: "calc-1",
    athleteId: "athlete-1",
    localDate: "2026-06-26",
    timezone: "UTC",
    mode: "performance",
    dailyIqScore: 75,
    readinessScore: 75,
    mentalEdgeScore: 70,
    habitScore: null,
    safeLoadScore: null,
    recoverySupportScore: null,
    painRiskLevel: "none",
    confidence: "medium",
    dataUsed: ["checkIn", "moduleRegistry"],
    missingData: [],
    explanation: [],
    algorithmVersion: "daily-iq-test",
    moduleRegistryVersion: "registry-test",
    componentWeights: { wellnessReadiness: 0.35, mentalEdge: 0.2, loadFit: 0.2, habitConsistency: 0.15, recoverySupport: 0.1 },
    painCapApplied: null,
    highIntensityBlocked: false,
    createdAt: "2026-06-26T12:00:00.000Z",
    ...overrides
  };
}

function painGuardrail(state: PainGuardrail["state"]): PainGuardrail {
  return {
    athleteId: "athlete-1",
    localDate: "2026-06-26",
    state,
    riskLevel: state === "capped" ? "high" : state === "monitor" ? "moderate" : "none",
    maxTrainingIntensity: state === "capped" ? "recovery" : state === "monitor" ? "low" : "normal",
    dailyIqCap: state === "capped" ? 60 : null,
    requiredCopyKey: "copy",
    reasonCodes: state === "capped" ? ["high_pain_today"] : state === "monitor" ? ["monitor_pain_today"] : [],
    dataUsed: ["daily_check_ins"],
    missingData: [],
    generatedAt: "2026-06-26T12:00:00.000Z"
  };
}
