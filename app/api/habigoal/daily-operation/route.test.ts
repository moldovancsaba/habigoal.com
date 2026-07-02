import { beforeEach, describe, expect, it, vi } from "vitest";
import { canOpenProductSurface, getAuthUser, type AuthUser } from "@/lib/access";
import { getHabigoalTodayProjection } from "@/services/habigoal-product.service";
import { runMirroredAthleteIqDailyEngine } from "@/services/athleteiq-daily-engine.service";
import { patchSharedDailyState } from "@/services/shared-daily-state.service";
import type { DailyEngineRun } from "@/types/athleteiq-daily-engine";
import { POST } from "./route";

vi.mock("@/lib/access", () => ({
  canOpenProductSurface: vi.fn(),
  getAuthUser: vi.fn()
}));

vi.mock("@/lib/habigoal-api", () => ({
  createHabigoalCorrelationId: () => "hbg-test",
  habigoalJsonError: vi.fn((code: string, status: number, correlationId: string, options = {}) => Response.json({
    ok: false,
    code,
    correlationId,
    ...options
  }, { status })),
  logHabigoalEvent: vi.fn()
}));

vi.mock("@/services/athleteiq-daily-engine.service", () => ({
  runMirroredAthleteIqDailyEngine: vi.fn()
}));

vi.mock("@/services/habigoal-product.service", () => ({
  getHabigoalTodayProjection: vi.fn()
}));

vi.mock("@/services/shared-daily-state.service", () => ({
  patchSharedDailyState: vi.fn(),
  SharedDailyStateError: class MockSharedDailyStateError extends Error {
    code: "FORBIDDEN" | "PRODUCT_ACCESS_DENIED" | "VALIDATION_ERROR";

    constructor(code: "FORBIDDEN" | "PRODUCT_ACCESS_DENIED" | "VALIDATION_ERROR", message: string) {
      super(message);
      this.code = code;
    }
  }
}));

const user: AuthUser = {
  email: "coach@example.com",
  name: "Coach",
  primaryRole: "trainer",
  roles: ["trainer"],
  productEntitlements: {
    habigoal: { enabled: true, reason: "self_registered" },
    athleteIq: { enabled: false }
  },
  teamIds: []
};

const mockedCanOpenProductSurface = vi.mocked(canOpenProductSurface);
const mockedGetAuthUser = vi.mocked(getAuthUser);
const mockedGetHabigoalTodayProjection = vi.mocked(getHabigoalTodayProjection);
const mockedPatchSharedDailyState = vi.mocked(patchSharedDailyState);
const mockedRunMirroredAthleteIqDailyEngine = vi.mocked(runMirroredAthleteIqDailyEngine);

describe("Habigoal daily operation route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetAuthUser.mockResolvedValue(user);
    mockedCanOpenProductSurface.mockReturnValue(true);
    mockedPatchSharedDailyState.mockResolvedValue({
      athleteId: "personal-profile",
      athleteName: "Coach Personal Habits",
      checkIn: { energy: 80, mood: 70, sleep: 75, soreness: 20 },
      dataFreshness: { generatedAt: "2026-07-01T00:00:00.000Z", sourceCollections: ["athleteiq_checkins", "habit_records"] },
      habits: { completed: ["hydrate"], recorded: true, total: 6 },
      localDate: "2026-07-01",
      product: "habigoal",
      status: {
        confidence: "high",
        missingSignals: [],
        nextActionKey: "balanced",
        reasonCodes: ["all_daily_signals_present"],
        score: 72,
        status: "balanced"
      },
      timezone: "Europe/Budapest",
      version: "shared-daily-state-v1"
    });
    const lifestyleRun = engineRun("lifestyle");
    const performanceRun = engineRun("performance");
    mockedRunMirroredAthleteIqDailyEngine.mockResolvedValue({
      lifestyle: lifestyleRun,
      performance: performanceRun,
      primary: lifestyleRun
    });
    mockedGetHabigoalTodayProjection.mockResolvedValue({
      athleteId: "personal-profile",
      athleteName: "Coach Personal Habits",
      completedHabits: ["hydrate"],
      confidence: "high",
      correlationId: "hbg-test",
      dataState: "ready",
      hasLiveCheckIn: true,
      hasLiveHabits: true,
      localDate: "2026-07-01",
      missingSignals: [],
      nextActionKey: "balanced",
      reasonCodes: ["all_daily_signals_present"],
      score: 72,
      source: "atlas",
      status: "balanced",
      timezone: "Europe/Budapest",
      values: { energy: 80, mood: 70, sleep: 75, soreness: 20 }
    });
  });

  it("allows a standalone Habigoal user to save without a known athleteId", async () => {
    const response = await POST(new Request("http://localhost/api/habigoal/daily-operation", {
      method: "POST",
      body: JSON.stringify({
        habits: ["hydrate"],
        values: { energy: 80, mood: 70, sleep: 75, soreness: 20 }
      })
    }));

    expect(response.status).toBe(200);
    expect(mockedPatchSharedDailyState).toHaveBeenCalledWith({
      athleteId: "",
      habits: ["hydrate"],
      idempotencyKey: expect.stringMatching(/^self:hbg-op-/),
      localDate: undefined,
      product: "habigoal",
      timezone: "Europe/Budapest",
      user,
      values: { energy: 80, mood: 70, sleep: 75, soreness: 20 }
    });
    expect(mockedRunMirroredAthleteIqDailyEngine).toHaveBeenCalledWith(expect.objectContaining({
      athleteId: "personal-profile",
      primaryMode: "lifestyle"
    }));
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      projection: {
        athleteId: "personal-profile",
        athleteName: "Coach Personal Habits"
      }
    });
  });
});

function engineRun(mode: DailyEngineRun["mode"]): DailyEngineRun {
  return {
    runId: `engine-${mode}`,
    athleteId: "personal-profile",
    localDate: "2026-07-01",
    timezone: "Europe/Budapest",
    mode,
    sourceEvent: "check_in_submitted",
    idempotencyKey: `idem-${mode}`,
    dailyIq: null,
    painGuardrail: null,
    readinessRoute: null,
    dailyPlan: null,
    twinProjections: [],
    coachActions: [],
    partialFailures: [],
    generatedAt: "2026-07-01T00:00:00.000Z"
  };
}
