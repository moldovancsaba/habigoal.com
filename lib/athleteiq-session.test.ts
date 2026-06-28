import { describe, expect, it } from "vitest";
import { POST as postDebrief } from "@/app/api/athleteiq/sessions/[id]/debrief/route";
import { GET as listSessions } from "@/app/api/athleteiq/sessions/route";
import {
  ATHLETEIQ_SESSION_VERSION,
  buildSessionFromPlan,
  canTransitionSession,
  estimateSessionLoad,
  validateGuardrailBeforeStart
} from "@/lib/athleteiq-session";
import type { DailyPlan } from "@/types/athleteiq-daily-plan";
import type { PainGuardrail } from "@/types/athleteiq-pain-safety";

describe("AthleteIQ session lifecycle contract", () => {
  it("builds deterministic executable blocks from the daily plan", () => {
    const session = buildSessionFromPlan({
      athleteId: "athlete-1",
      dailyPlan: dailyPlan("high", "40-60"),
      painGuardrail: painGuardrail(null)
    }, new Date("2026-06-26T12:00:00.000Z"));

    expect(ATHLETEIQ_SESSION_VERSION).toBe("aiq-session-1270.1");
    expect(session.sessionId).toBe("aiq-session:athlete-1:2026-06-26");
    expect(session.state).toBe("draft");
    expect(session.blocks.map((block) => block.type)).toEqual(["warmup", "main", "cooldown"]);
    expect(session.log.estimatedLoadPoints).toBe(250);
  });

  it("creates a single recovery block for recovery recommendations", () => {
    const session = buildSessionFromPlan({
      athleteId: "athlete-1",
      dailyPlan: dailyPlan("recovery", "20-30"),
      painGuardrail: painGuardrail(60)
    });

    expect(session.blocks).toEqual([
      expect.objectContaining({
        type: "recovery",
        durationMinutes: 25,
        safetyNotesKey: "athleteiq.sessions.safety.recoveryOnly"
      })
    ]);
  });

  it("enforces state transitions and guardrails before start", () => {
    const session = buildSessionFromPlan({
      athleteId: "athlete-1",
      dailyPlan: dailyPlan("high", "20-40"),
      painGuardrail: painGuardrail(60)
    });

    expect(canTransitionSession("draft", "active")).toBe(true);
    expect(canTransitionSession("completed", "active")).toBe(false);
    expect(validateGuardrailBeforeStart(session)).toBe("high intensity cannot start under pain cap");
  });

  it("caps estimated load and bounds RPE", () => {
    expect(estimateSessionLoad(120, "high", 12)).toBe(900);
    expect(estimateSessionLoad(30, "low", 0)).toBe(18);
  });
});

describe("AthleteIQ session API validation", () => {
  it("validates athlete id before listing sessions", async () => {
    const response = await listSessions(new Request("http://localhost/api/athleteiq/sessions"));
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.code).toBe("VALIDATION_ERROR");
    expect(payload.correlationId).toMatch(/^aiq-/);
  });

  it("validates debrief ranges before persistence access", async () => {
    const response = await postDebrief(new Request("http://localhost/api/athleteiq/sessions/session-1/debrief", {
      method: "POST",
      body: JSON.stringify({ rpe: 11, completionPct: 110, painAfter: 0, moodAfter: 4 })
    }), { params: Promise.resolve({ id: "session-1" }) });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.code).toBe("VALIDATION_ERROR");
    expect(payload.details).toEqual([
      "rpe must be 1-10",
      "completionPct must be 0-100",
      "painAfter must be 1-10"
    ]);
    expect(payload.correlationId).toMatch(/^aiq-/);
  });
});

function dailyPlan(intensity: DailyPlan["recommendation"]["intensity"], durationRange: string): DailyPlan {
  return {
    id: "daily-plan-1",
    athleteId: "athlete-1",
    localDate: "2026-06-26",
    timezone: "UTC",
    status: "active",
    tasks: [],
    recommendation: {
      intensity,
      type: "standard",
      durationRange,
      rationale: ["test"],
      blockedByPainGuardrail: false,
      confidence: "medium"
    },
    dataUsed: ["daily_iq"],
    missingData: [],
    generatedAt: "2026-06-26T12:00:00.000Z",
    updatedAt: "2026-06-26T12:00:00.000Z",
    version: "test",
    auditHistory: []
  };
}

function painGuardrail(dailyIqCap: number | null): PainGuardrail {
  return {
    athleteId: "athlete-1",
    localDate: "2026-06-26",
    state: dailyIqCap === null ? "none" : "capped",
    riskLevel: dailyIqCap === null ? "none" : "high",
    maxTrainingIntensity: dailyIqCap === null ? "normal" : "recovery",
    dailyIqCap,
    requiredCopyKey: "copy",
    reasonCodes: dailyIqCap === null ? [] : ["pain_guardrail"],
    dataUsed: ["daily_check_ins"],
    missingData: [],
    generatedAt: "2026-06-26T12:00:00.000Z"
  };
}
