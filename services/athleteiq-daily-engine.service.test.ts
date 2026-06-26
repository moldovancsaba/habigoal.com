import { beforeEach, describe, expect, it, vi } from "vitest";
import { logAuditEvent } from "@/lib/audit";
import { upsertCoachAction } from "@/repositories/coach-actions.repository";
import { recalculateDailyIq } from "@/services/athleteiq-daily-iq.service";
import { generateDailyPlan } from "@/services/athleteiq-daily-plan.service";
import { getPainGuardrailToday } from "@/services/athleteiq-pain-safety.service";
import { runAthleteIqDailyEngine, validateDailyEngineInput } from "@/services/athleteiq-daily-engine.service";
import { recalculateReadinessRoute } from "@/services/athleteiq-readiness-route.service";
import { rebuildAthleteTwinProjection } from "@/services/athleteiq-twin-projection.service";
import type { DailyIqSnapshot } from "@/types/athleteiq-daily-iq";
import type { DailyPlan } from "@/types/athleteiq-daily-plan";
import type { PainGuardrail } from "@/types/athleteiq-pain-safety";
import type { ReadinessRouteSnapshot } from "@/types/athleteiq-readiness-route";

vi.mock("@/lib/audit", () => ({ logAuditEvent: vi.fn() }));
vi.mock("@/repositories/coach-actions.repository", () => ({ upsertCoachAction: vi.fn() }));
vi.mock("@/services/athleteiq-daily-iq.service", () => ({ recalculateDailyIq: vi.fn() }));
vi.mock("@/services/athleteiq-daily-plan.service", () => ({ generateDailyPlan: vi.fn() }));
vi.mock("@/services/athleteiq-pain-safety.service", () => ({ getPainGuardrailToday: vi.fn() }));
vi.mock("@/services/athleteiq-readiness-route.service", () => ({ recalculateReadinessRoute: vi.fn() }));
vi.mock("@/services/athleteiq-twin-projection.service", () => ({ rebuildAthleteTwinProjection: vi.fn() }));

describe("AthleteIQ daily engine orchestration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(logAuditEvent).mockResolvedValue(undefined);
    vi.mocked(upsertCoachAction).mockImplementation(async (input) => ({
      ...input,
      createdAt: "2026-06-26T12:00:00.000Z",
      updatedAt: "2026-06-26T12:00:00.000Z"
    }));
    vi.mocked(rebuildAthleteTwinProjection).mockResolvedValue({
      athlete: { id: "athlete-1", name: null, status: null, position: null, organisationId: null },
      view: "athlete",
      activeDimensions: [],
      liteDimensions: [],
      futureDimensions: [],
      sourceConfidence: "medium",
      registryVersion: "test",
      projectionVersion: "test",
      redactions: [],
      updatedAt: "2026-06-26T12:00:00.000Z"
    });
  });

  it("validates required engine inputs", () => {
    expect(validateDailyEngineInput({ athleteId: "", sourceEvent: "manual_recalculate" })).toEqual(["athleteId is required", "actor.email is required"]);
    expect(validateDailyEngineInput({
      athleteId: "athlete-1",
      localDate: "bad",
      sourceEvent: "manual_recalculate",
      actor: { email: "coach@example.com", name: "Coach", role: "trainer" }
    })).toContain("localDate must use YYYY-MM-DD");
  });

  it("runs the daily pipeline and creates persistent coach actions", async () => {
    vi.mocked(recalculateDailyIq).mockResolvedValue({ errors: [], snapshot: dailyIq({ confidence: "low", missingData: ["habits", "sessionLoad"] }) });
    vi.mocked(getPainGuardrailToday).mockResolvedValue(painGuardrail("monitor"));
    vi.mocked(recalculateReadinessRoute).mockResolvedValue(readinessRoute("amber"));
    vi.mocked(generateDailyPlan).mockResolvedValue(dailyPlan());

    const run = await runAthleteIqDailyEngine({
      athleteId: "athlete-1",
      localDate: "2026-06-26",
      timezone: "Europe/Budapest",
      mode: "performance",
      sourceEvent: "check_in_submitted",
      idempotencyKey: "idem-1",
      actor: { email: "coach@example.com", name: "Coach", role: "trainer" }
    });

    expect(recalculateDailyIq).toHaveBeenCalledWith({ athleteId: "athlete-1", localDate: "2026-06-26", timezone: "Europe/Budapest", mode: "performance" });
    expect(generateDailyPlan).toHaveBeenCalledWith({ athleteId: "athlete-1", localDate: "2026-06-26", timezone: "Europe/Budapest" });
    expect(rebuildAthleteTwinProjection).toHaveBeenCalledTimes(4);
    expect(upsertCoachAction).toHaveBeenCalledTimes(4);
    expect(run.coachActions.map((action) => action.recommendationKey)).toEqual([
      "athleteiq.daily_engine.missing_data",
      "athleteiq.pain_safety.review",
      "athleteiq.readiness_route.review",
      "athleteiq.daily_plan.critical_tasks"
    ]);
    expect(run.partialFailures).toEqual([]);
  });

  it("returns partial failures without hiding successful steps", async () => {
    vi.mocked(recalculateDailyIq).mockResolvedValue({ errors: [], snapshot: dailyIq({ confidence: "high" }) });
    vi.mocked(getPainGuardrailToday).mockRejectedValue(new Error("pain service unavailable"));
    vi.mocked(recalculateReadinessRoute).mockResolvedValue(readinessRoute("green"));
    vi.mocked(generateDailyPlan).mockResolvedValue(dailyPlan({ criticalTasks: 0 }));

    const run = await runAthleteIqDailyEngine({
      athleteId: "athlete-1",
      localDate: "2026-06-26",
      timezone: "UTC",
      mode: "performance",
      sourceEvent: "manual_recalculate",
      actor: { email: "coach@example.com", name: "Coach", role: "trainer" }
    });

    expect(run.dailyIq?.confidence).toBe("high");
    expect(run.readinessRoute?.route).toBe("green");
    expect(run.partialFailures).toEqual([{ step: "pain_guardrail", message: "pain service unavailable" }]);
  });
});

function dailyIq(overrides: Partial<DailyIqSnapshot> = {}): DailyIqSnapshot {
  return {
    id: "daily-iq-1",
    calculationId: "calc-1",
    athleteId: "athlete-1",
    localDate: "2026-06-26",
    timezone: "UTC",
    mode: "performance",
    dailyIqScore: 58,
    readinessScore: 62,
    mentalEdgeScore: 55,
    habitScore: null,
    safeLoadScore: null,
    recoverySupportScore: 60,
    painRiskLevel: "moderate",
    confidence: "medium",
    dataUsed: ["checkIn", "recoverySupport", "moduleRegistry"],
    missingData: [],
    explanation: [],
    algorithmVersion: "test",
    moduleRegistryVersion: "test",
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
    riskLevel: state === "monitor" ? "moderate" : "none",
    maxTrainingIntensity: state === "monitor" ? "low" : "normal",
    dailyIqCap: null,
    requiredCopyKey: "copy",
    reasonCodes: state === "monitor" ? ["monitor_pain_today"] : [],
    dataUsed: ["daily_check_ins"],
    missingData: [],
    generatedAt: "2026-06-26T12:00:00.000Z"
  };
}

function readinessRoute(route: ReadinessRouteSnapshot["route"]): ReadinessRouteSnapshot {
  return {
    id: "route-1",
    athleteId: "athlete-1",
    localDate: "2026-06-26",
    timezone: "UTC",
    route,
    action: route === "green" ? "full_training_allowed" : route === "amber" ? "controlled_training_only" : "recovery_or_coach_review",
    readinessScore: 62,
    dailyIqScore: route === "green" ? 82 : 58,
    confidence: "medium",
    rulesUsed: [],
    capsApplied: [],
    allowedActions: [],
    blockedActions: route === "green" ? [] : ["unplanned_high_intensity"],
    dataUsed: ["daily_iq"],
    missingData: [],
    moduleMaturity: "active",
    claimBoundary: "backed_by_user_input",
    algorithmVersion: "test",
    generatedAt: "2026-06-26T12:00:00.000Z",
    auditHistory: []
  };
}

function dailyPlan(input: { criticalTasks?: number } = {}): DailyPlan {
  const criticalTasks = input.criticalTasks ?? 1;
  return {
    id: "plan-1",
    athleteId: "athlete-1",
    localDate: "2026-06-26",
    timezone: "UTC",
    status: "active",
    tasks: Array.from({ length: criticalTasks }, (_, index) => ({
      id: `critical-${index + 1}`,
      category: "safety",
      titleKey: "title",
      descriptionKey: "description",
      priority: "critical",
      sourceReasonCodes: ["pain_guardrail"],
      dueWindow: "training",
      completionState: "open"
    })),
    recommendation: { intensity: "low", type: "controlled", durationRange: "20-30", rationale: [], blockedByPainGuardrail: false },
    dataUsed: ["daily_iq"],
    missingData: [],
    generatedAt: "2026-06-26T12:00:00.000Z",
    updatedAt: "2026-06-26T12:00:00.000Z",
    version: "test",
    auditHistory: []
  };
}
