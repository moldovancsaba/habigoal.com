import { beforeEach, describe, expect, it, vi } from "vitest";
import { upsertAthleteIqCheckInSnapshot } from "@/repositories/athleteiq-check-in.repository";
import { runAthleteIqDailyEngine } from "@/services/athleteiq-daily-engine.service";
import {
  mapAssessmentToAthleteIqValues,
  syncAssessmentToAthleteIqDailyState
} from "@/services/assessment-daily-state-bridge.service";
import type { AssessmentRecord, ScoreEntry } from "@/types/assessment";
import type { AthleteIqCheckInSnapshot } from "@/types/athleteiq-check-in";

vi.mock("@/repositories/athleteiq-check-in.repository", () => ({
  upsertAthleteIqCheckInSnapshot: vi.fn()
}));

vi.mock("@/services/athleteiq-daily-engine.service", () => ({
  runAthleteIqDailyEngine: vi.fn()
}));

const mockedUpsertAthleteIqCheckInSnapshot = vi.mocked(upsertAthleteIqCheckInSnapshot);
const mockedRunAthleteIqDailyEngine = vi.mocked(runAthleteIqDailyEngine);

describe("assessment daily state bridge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedUpsertAthleteIqCheckInSnapshot.mockImplementation(async (snapshot) => ({
      ...snapshot,
      id: `${snapshot.mode}-snapshot`
    }));
    mockedRunAthleteIqDailyEngine.mockResolvedValue({
      runId: "engine-run-1",
      athleteId: "athlete-1",
      localDate: "2026-06-27",
      timezone: "Europe/Budapest",
      mode: "performance",
      sourceEvent: "check_in_submitted",
      dailyIq: null,
      painGuardrail: null,
      readinessRoute: null,
      dailyPlan: null,
      twinProjections: [],
      coachActions: [],
      partialFailures: [],
      generatedAt: "2026-06-27T12:00:00.000Z"
    });
  });

  it("maps legacy 1-5 assessment answers into AIQ check-in values", () => {
    const values = mapAssessmentToAthleteIqValues(assessment());

    expect(values).toMatchObject({
      sleepQuality: 8,
      fatigue: 1,
      pain: 8,
      stress: 5,
      mood: 8,
      confidence: 10,
      focus: 6,
      sleepHours: 9,
      trainingLoad: 300,
      note: "Felt better after warm-up."
    });
  });

  it("writes lifestyle and performance snapshots and runs the AIQ daily engine", async () => {
    const result = await syncAssessmentToAthleteIqDailyState(assessment(), {
      actor: { email: "coach@example.com", name: "Coach", role: "trainer" }
    });

    expect(result.skippedReason).toBeUndefined();
    expect(mockedUpsertAthleteIqCheckInSnapshot).toHaveBeenCalledTimes(2);
    const snapshots = mockedUpsertAthleteIqCheckInSnapshot.mock.calls.map((call) => call[0] as AthleteIqCheckInSnapshot);
    expect(snapshots.map((snapshot) => snapshot.mode)).toEqual(["lifestyle", "performance"]);
    expect(snapshots.every((snapshot) => snapshot.athleteId === "athlete-1")).toBe(true);
    expect(snapshots.every((snapshot) => snapshot.localDate === "2026-06-27")).toBe(true);
    expect(snapshots[0].values).toMatchObject({
      sleepQuality: { rawValue: 8 },
      fatigue: { rawValue: 1 },
      pain: { rawValue: 8 },
      stress: { rawValue: 5 },
      mood: { rawValue: 8 }
    });
    expect(snapshots[1].values).toMatchObject({
      confidence: { rawValue: 10 },
      focus: { rawValue: 6 },
      trainingLoad: { rawValue: 300 }
    });
    expect(mockedRunAthleteIqDailyEngine).toHaveBeenCalledWith(expect.objectContaining({
      athleteId: "athlete-1",
      localDate: "2026-06-27",
      mode: "performance",
      sourceEvent: "check_in_submitted",
      actor: { email: "coach@example.com", name: "Coach", role: "trainer" }
    }));
  });

  it("skips shared state writes when required daily scores are incomplete", async () => {
    const incomplete = assessment({
      scores: {
        sleep_quality: score(4),
        energy_level: score(5)
      }
    });

    const result = await syncAssessmentToAthleteIqDailyState(incomplete);

    expect(result).toMatchObject({
      athleteId: "athlete-1",
      localDate: "2026-06-27",
      skippedReason: "missing_required_scores"
    });
    expect(mockedUpsertAthleteIqCheckInSnapshot).not.toHaveBeenCalled();
    expect(mockedRunAthleteIqDailyEngine).not.toHaveBeenCalled();
  });
});

function assessment(overrides: Partial<AssessmentRecord> = {}): AssessmentRecord {
  return {
    _id: "assessment-1",
    childId: "athlete-1",
    mode: "rapid",
    child: {
      name: "Athlete One",
      birthDate: "2010-01-01",
      ageGroup: "10-12",
      dominantHand: "",
      dominantEye: "",
      dominantFoot: "",
      knownTraits: "",
      parentSignals: ""
    },
    session: {
      date: "2026-06-27",
      location: "",
      conductor: "",
      observers: "",
      groupSize: "",
      context: "structured",
      consentPhoto: false,
      consentReport: true
    },
    trainingLoad: {
      sessionType: "team",
      durationMinutes: 60,
      rpe: 5,
      externalLoad: undefined
    },
    scores: {
      sleep_hours: score(3),
      sleep_quality: score(4),
      energy_level: score(5),
      body_feel: score(2),
      fuel_hydration: score(2),
      mood_state: score(4),
      stress_load: score(3),
      confidence_level: score(5),
      focus_level: score(3)
    },
    notes: {
      general: "Felt better after warm-up.",
      movement: "",
      social: "",
      mental: "",
      adaptations: "",
      referral: ""
    },
    attachments: [],
    standardsVersionUsed: "v1",
    createdAt: "2026-06-27T12:00:00.000Z",
    updatedAt: "2026-06-27T12:00:00.000Z",
    updateHistory: [],
    computed: {
      movementAverage: 4,
      socialAverage: 4,
      mentalAverage: 4,
      ski: 4,
      completion: { done: 9, total: 9 }
    },
    ...overrides
  };
}

function score(value: number): ScoreEntry {
  return { score: value, note: "" };
}
