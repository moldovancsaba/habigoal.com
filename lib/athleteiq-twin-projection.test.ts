import { describe, expect, it } from "vitest";
import { GET as getTwinProjection } from "@/app/api/athleteiq/athletes/[id]/twin/route";
import { POST as rebuildTwinProjection } from "@/app/api/athleteiq/athletes/[id]/twin/rebuild/route";
import { buildAthleteTwinProjection } from "@/lib/athleteiq-twin-projection";
import type { DailyIqSnapshot } from "@/types/athleteiq-daily-iq";
import type { DailyPlan } from "@/types/athleteiq-daily-plan";
import type { MentalEdgeSnapshot } from "@/types/athleteiq-mental-edge";
import type { PainGuardrail } from "@/types/athleteiq-pain-safety";

describe("AthleteIQ twin projection contract", () => {
  it("orders active, lite, and future dimensions without unsupported future values", () => {
    const projection = buildAthleteTwinProjection({
      athleteId: "athlete-1",
      athlete: { name: "Athlete One", birthDate: "2010-01-01", createdAt: "2026-06-26T12:00:00.000Z", updatedAt: "2026-06-26T12:00:00.000Z" },
      view: "coach",
      viewerRole: "trainer",
      dailyIq: dailyIq(),
      mentalEdge: mentalEdge(),
      painGuardrail: painGuardrail(),
      habitRecord: null,
      dailyPlan: dailyPlan()
    }, new Date("2026-06-26T12:00:00.000Z"));

    expect(projection.activeDimensions.map((dimension) => dimension.key)).toEqual(["readiness", "mental_edge", "pain_safety", "habits", "daily_plan"]);
    expect(projection.liteDimensions.length).toBeGreaterThan(0);
    expect(projection.futureDimensions.length).toBeGreaterThan(0);
    expect(projection.futureDimensions.every((dimension) => dimension.valueSummary === null)).toBe(true);
    expect(projection.futureDimensions.every((dimension) => dimension.sourceLabels.includes("future_source_only"))).toBe(true);
    expect(projection.sourceConfidence).toBe("high");
  });

  it("redacts private mental and pain details for parent projection", () => {
    const projection = buildAthleteTwinProjection({
      athleteId: "athlete-1",
      athlete: null,
      view: "parent",
      viewerRole: "parent",
      dailyIq: dailyIq(),
      mentalEdge: mentalEdge(),
      painGuardrail: painGuardrail(),
      habitRecord: null,
      dailyPlan: null
    });

    expect(projection.activeDimensions.find((dimension) => dimension.key === "mental_edge")?.status).toBe("redacted");
    expect(projection.activeDimensions.find((dimension) => dimension.key === "pain_safety")?.status).toBe("redacted");
    expect(projection.redactions).toContain("mental_edge.score");
    expect(projection.redactions).toContain("pain_safety.riskLevel");
  });

  it("shows setup-required dimensions when active sources are missing", () => {
    const projection = buildAthleteTwinProjection({
      athleteId: "athlete-1",
      athlete: null,
      view: "athlete",
      viewerRole: "athlete",
      dailyIq: null,
      mentalEdge: null,
      painGuardrail: null,
      habitRecord: null,
      dailyPlan: null
    });

    expect(projection.sourceConfidence).toBe("insufficient");
    expect(projection.activeDimensions.every((dimension) => dimension.status === "setup_required")).toBe(true);
  });
});

describe("AthleteIQ twin projection API validation", () => {
  it("validates GET localDate before data access", async () => {
    const response = await getTwinProjection(
      new Request("http://localhost/api/athleteiq/athletes/athlete-1/twin?localDate=bad-date"),
      { params: Promise.resolve({ id: "athlete-1" }) }
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.code).toBe("VALIDATION_ERROR");
    expect(payload.correlationId).toMatch(/^aiq-/);
  });

  it("validates rebuild localDate before persistence", async () => {
    const response = await rebuildTwinProjection(
      new Request("http://localhost/api/athleteiq/athletes/athlete-1/twin/rebuild", {
        method: "POST",
        body: JSON.stringify({ localDate: "bad-date" })
      }),
      { params: Promise.resolve({ id: "athlete-1" }) }
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.code).toBe("VALIDATION_ERROR");
    expect(payload.correlationId).toMatch(/^aiq-/);
  });
});

function dailyIq(): DailyIqSnapshot {
  return {
    calculationId: "calc-1",
    athleteId: "athlete-1",
    localDate: "2026-06-26",
    timezone: "UTC",
    mode: "performance",
    dailyIqScore: 82,
    readinessScore: 80,
    mentalEdgeScore: 78,
    habitScore: 70,
    safeLoadScore: 90,
    recoverySupportScore: 80,
    painRiskLevel: "none",
    confidence: "high",
    dataUsed: ["checkIn", "habits", "sessionLoad", "moduleRegistry"],
    missingData: [],
    explanation: [],
    algorithmVersion: "test",
    moduleRegistryVersion: "test",
    componentWeights: { wellnessReadiness: 0.35, mentalEdge: 0.2, loadFit: 0.2, habitConsistency: 0.15, recoverySupport: 0.1 },
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
    score: 76,
    riskLevel: "stable",
    trend: "steady",
    routines: [],
    alertCandidate: null,
    privateFieldsExcluded: ["reflectionBody"],
    dataUsed: ["daily_check_ins"],
    missingData: [],
    sourceLabels: {},
    algorithmVersion: "test",
    generatedAt: "2026-06-26T12:00:00.000Z"
  };
}

function painGuardrail(): PainGuardrail {
  return {
    athleteId: "athlete-1",
    localDate: "2026-06-26",
    state: "none",
    riskLevel: "none",
    maxTrainingIntensity: "normal",
    dailyIqCap: null,
    requiredCopyKey: "none",
    reasonCodes: [],
    dataUsed: ["daily_check_ins"],
    missingData: [],
    generatedAt: "2026-06-26T12:00:00.000Z"
  };
}

function dailyPlan(): DailyPlan {
  return {
    athleteId: "athlete-1",
    localDate: "2026-06-26",
    timezone: "UTC",
    status: "active",
    tasks: [],
    recommendation: { intensity: "moderate", type: "controlled", durationRange: "35-60", rationale: [], blockedByPainGuardrail: false, confidence: "medium" },
    dataUsed: ["daily_iq"],
    missingData: [],
    generatedAt: "2026-06-26T12:00:00.000Z",
    updatedAt: "2026-06-26T12:00:00.000Z",
    version: "test",
    auditHistory: []
  };
}
