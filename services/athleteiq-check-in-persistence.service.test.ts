import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildAthleteIqCheckInSnapshot } from "@/lib/athleteiq-check-in";
import { upsertAthleteIqCheckInSnapshot } from "@/repositories/athleteiq-check-in.repository";
import {
  buildLifestyleMirror,
  upsertAthleteIqCheckInWithSharedDailyMirror
} from "@/services/athleteiq-check-in-persistence.service";

vi.mock("@/repositories/athleteiq-check-in.repository", () => ({
  upsertAthleteIqCheckInSnapshot: vi.fn()
}));

const mockedUpsertAthleteIqCheckInSnapshot = vi.mocked(upsertAthleteIqCheckInSnapshot);

describe("Athlete IQ check-in shared daily persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedUpsertAthleteIqCheckInSnapshot.mockImplementation(async (snapshot) => ({
      ...snapshot,
      id: `${snapshot.mode}-saved`
    }));
  });

  it("mirrors performance check-ins into the lifestyle snapshot Habigoal reads", async () => {
    const source = performanceSnapshot();

    const mirror = buildLifestyleMirror(source);

    expect(mirror).toMatchObject({
      athleteId: "athlete-1",
      localDate: "2026-06-27",
      mode: "lifestyle",
      timezone: "Europe/Budapest",
      idempotencyKey: "perf-1:lifestyle"
    });
    expect(mirror.values).toMatchObject({
      sleepQuality: { rawValue: 8 },
      fatigue: { rawValue: 3 },
      pain: { rawValue: 2 },
      stress: { rawValue: 4 },
      mood: { rawValue: 7 },
      note: { rawValue: "Ready for controlled work." }
    });

    const saved = await upsertAthleteIqCheckInWithSharedDailyMirror(source);

    expect(mockedUpsertAthleteIqCheckInSnapshot).toHaveBeenCalledTimes(2);
    expect(mockedUpsertAthleteIqCheckInSnapshot.mock.calls.map((call) => call[0].mode)).toEqual(["performance", "lifestyle"]);
    expect(saved.snapshot.id).toBe("performance-saved");
    expect(saved.sharedDailySnapshot.id).toBe("lifestyle-saved");
  });

  it("does not duplicate writes for lifestyle check-ins", async () => {
    const source = lifestyleSnapshot();

    const saved = await upsertAthleteIqCheckInWithSharedDailyMirror(source);

    expect(mockedUpsertAthleteIqCheckInSnapshot).toHaveBeenCalledTimes(1);
    expect(mockedUpsertAthleteIqCheckInSnapshot).toHaveBeenCalledWith(source);
    expect(saved.snapshot).toBe(saved.sharedDailySnapshot);
  });
});

function performanceSnapshot() {
  const result = buildAthleteIqCheckInSnapshot({
    athleteId: "athlete-1",
    idempotencyKey: "perf-1",
    mode: "performance",
    timezone: "Europe/Budapest",
    values: {
      sleepQuality: 8,
      fatigue: 3,
      pain: 2,
      stress: 4,
      mood: 7,
      confidence: 8,
      focus: 9,
      trainingLoad: 420,
      note: "Ready for controlled work."
    }
  }, new Date("2026-06-27T08:00:00.000Z"));

  if (!result.snapshot) throw new Error(result.errors.join(", "));
  return { ...result.snapshot, localDate: "2026-06-27" };
}

function lifestyleSnapshot() {
  const result = buildAthleteIqCheckInSnapshot({
    athleteId: "athlete-1",
    idempotencyKey: "life-1",
    mode: "lifestyle",
    timezone: "Europe/Budapest",
    values: {
      sleepQuality: 7,
      fatigue: 4,
      pain: 1,
      stress: 3,
      mood: 8
    }
  }, new Date("2026-06-27T08:00:00.000Z"));

  if (!result.snapshot) throw new Error(result.errors.join(", "));
  return { ...result.snapshot, localDate: "2026-06-27" };
}
