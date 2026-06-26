import { describe, expect, it } from "vitest";
import { GET as getDay } from "@/app/api/athleteiq/calendar/day/route";
import { POST as postEntry } from "@/app/api/athleteiq/calendar/entries/route";
import { ATHLETEIQ_CALENDAR_VERSION, buildDayContext, buildDayEntry, validateDayEntryInput } from "@/lib/athleteiq-calendar";
import type { DailyPlan } from "@/types/athleteiq-daily-plan";
import type { AthleteIqSession } from "@/types/athleteiq-session";

describe("AthleteIQ daily reality map contract", () => {
  it("sorts timed entries, keeps unknown-time entries unscheduled, and merges plan tasks", () => {
    const context = buildDayContext({
      athleteId: "athlete-1",
      localDate: "2026-06-26",
      timezone: "UTC",
      manualEntries: [
        entry("school", "2026-06-26T08:00:00.000Z", "2026-06-26T14:00:00.000Z"),
        buildDayEntry({ athleteId: "athlete-1", localDate: "2026-06-26", type: "personal", titleKeyOrText: "unknown", source: "manual" })
      ],
      dailyPlan: dailyPlan(),
      sessions: []
    }, new Date("2026-06-26T12:00:00.000Z"));

    expect(ATHLETEIQ_CALENDAR_VERSION).toBe("aiq-calendar-1280.1");
    expect(context.entries.map((item) => item.type)).toEqual(["school"]);
    expect(context.unscheduledEntries.map((item) => item.source)).toEqual(["manual", "daily_plan"]);
    expect(context.missingData).toContain("athleteiq_sessions");
  });

  it("flags overlaps and insufficient recovery between load windows without deleting data", () => {
    const context = buildDayContext({
      athleteId: "athlete-1",
      localDate: "2026-06-26",
      timezone: "UTC",
      manualEntries: [
        entry("training", "2026-06-26T10:00:00.000Z", "2026-06-26T11:00:00.000Z"),
        entry("school", "2026-06-26T10:30:00.000Z", "2026-06-26T12:00:00.000Z"),
        entry("match", "2026-06-26T12:30:00.000Z", "2026-06-26T13:30:00.000Z")
      ],
      dailyPlan: null,
      sessions: []
    });

    expect(context.conflicts.map((conflict) => conflict.code)).toEqual(["overlap", "insufficient_recovery"]);
    expect(context.loadWindows).toHaveLength(2);
  });

  it("derives sequential session block entries from started sessions", () => {
    const context = buildDayContext({
      athleteId: "athlete-1",
      localDate: "2026-06-26",
      timezone: "UTC",
      manualEntries: [],
      dailyPlan: null,
      sessions: [session()]
    });

    expect(context.entries.map((item) => item.titleKeyOrText)).toEqual(["warmup", "main"]);
    expect(context.entries[1].startAt).toBe("2026-06-26T15:10:00.000Z");
    expect(context.dataUsed).toContain("athleteiq_sessions");
  });

  it("validates local day entry ranges and unknown-time rules", () => {
    expect(validateDayEntryInput({ athleteId: "athlete-1", localDate: "2026-06-26", type: "training", titleKeyOrText: "Training" })).toEqual([]);
    expect(validateDayEntryInput({ athleteId: "athlete-1", localDate: "2026-06-26", type: "training", titleKeyOrText: "Training", startAt: "2026-06-26T10:00:00.000Z" })).toContain("startAt and endAt must be provided together");
  });
});

describe("AthleteIQ calendar API validation", () => {
  it("validates athlete id before loading a day", async () => {
    const response = await getDay(new Request("http://localhost/api/athleteiq/calendar/day?date=2026-06-26"));
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.code).toBe("VALIDATION_ERROR");
    expect(payload.correlationId).toMatch(/^aiq-/);
  });

  it("validates entry type before persistence access", async () => {
    const response = await postEntry(new Request("http://localhost/api/athleteiq/calendar/entries", {
      method: "POST",
      body: JSON.stringify({ athleteId: "athlete-1", localDate: "2026-06-26", type: "external", titleKeyOrText: "Bad" })
    }));
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.code).toBe("VALIDATION_ERROR");
    expect(payload.correlationId).toMatch(/^aiq-/);
  });
});

function entry(type: "school" | "training" | "match", startAt: string, endAt: string) {
  return buildDayEntry({
    athleteId: "athlete-1",
    localDate: "2026-06-26",
    type,
    titleKeyOrText: type,
    startAt,
    endAt,
    source: "manual"
  });
}

function dailyPlan(): DailyPlan {
  return {
    id: "plan-1",
    athleteId: "athlete-1",
    localDate: "2026-06-26",
    timezone: "UTC",
    status: "active",
    tasks: [{
      id: "task-1",
      category: "habit",
      titleKey: "task",
      descriptionKey: "desc",
      priority: "medium",
      sourceReasonCodes: ["habit"],
      dueWindow: "anytime",
      completionState: "open"
    }],
    recommendation: {
      intensity: "low",
      type: "standard",
      durationRange: "20-30",
      rationale: [],
      blockedByPainGuardrail: false
    },
    dataUsed: [],
    missingData: [],
    generatedAt: "2026-06-26T12:00:00.000Z",
    updatedAt: "2026-06-26T12:00:00.000Z",
    version: "test",
    auditHistory: []
  };
}

function session(): AthleteIqSession {
  return {
    sessionId: "session-1",
    athleteId: "athlete-1",
    localDate: "2026-06-26",
    state: "active",
    sourcePlanId: "plan-1",
    recommendation: {
      intensity: "moderate",
      type: "standard",
      durationRange: "20-30",
      rationale: [],
      blockedByPainGuardrail: false
    },
    painGuardrail: {
      state: "none",
      maxTrainingIntensity: "normal",
      dailyIqCap: null,
      reasonCodes: []
    },
    blocks: [
      { type: "warmup", durationMinutes: 10, intensity: "low", instructionsKey: "warmup", safetyNotesKey: "safe" },
      { type: "main", durationMinutes: 20, intensity: "moderate", instructionsKey: "main", safetyNotesKey: "safe" }
    ],
    log: {
      sessionId: "session-1",
      athleteId: "athlete-1",
      sourcePlanId: "plan-1",
      startedAt: "2026-06-26T15:00:00.000Z",
      estimatedLoadPoints: 90
    },
    auditHistory: [],
    createdAt: "2026-06-26T12:00:00.000Z",
    updatedAt: "2026-06-26T12:00:00.000Z"
  };
}
