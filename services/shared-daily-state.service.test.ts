import { beforeEach, describe, expect, it, vi } from "vitest";
import { canAccessAthleteIqAthlete, canAccessHabigoalAthlete, canOpenProductSurface, type AuthUser } from "@/lib/access";
import { getAthleteIqCheckInSnapshot, upsertAthleteIqCheckInSnapshot } from "@/repositories/athleteiq-check-in.repository";
import { getChildById } from "@/repositories/child.repository";
import { getHabitRecordByAthleteIdAndDate, upsertHabitRecord } from "@/repositories/habit-records.repository";
import { ensureCanonicalAthleteProfileForUser } from "@/services/shared-athlete-profile.service";
import { getSharedDailyState, patchSharedDailyState, SharedDailyStateError } from "@/services/shared-daily-state.service";

vi.mock("@/lib/access", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/access")>(),
  canAccessAthleteIqAthlete: vi.fn(),
  canAccessHabigoalAthlete: vi.fn(),
  canOpenProductSurface: vi.fn()
}));

vi.mock("@/repositories/athleteiq-check-in.repository", () => ({
  getAthleteIqCheckInSnapshot: vi.fn(),
  upsertAthleteIqCheckInSnapshot: vi.fn()
}));

vi.mock("@/repositories/child.repository", () => ({
  getChildById: vi.fn()
}));

vi.mock("@/repositories/habit-records.repository", () => ({
  getHabitRecordByAthleteIdAndDate: vi.fn(),
  upsertHabitRecord: vi.fn()
}));

vi.mock("@/services/shared-athlete-profile.service", () => ({
  ensureCanonicalAthleteProfileForUser: vi.fn()
}));

const mockedCanOpenProductSurface = vi.mocked(canOpenProductSurface);
const mockedCanAccessHabigoalAthlete = vi.mocked(canAccessHabigoalAthlete);
const mockedCanAccessAthleteIqAthlete = vi.mocked(canAccessAthleteIqAthlete);
const mockedGetAthleteIqCheckInSnapshot = vi.mocked(getAthleteIqCheckInSnapshot);
const mockedUpsertAthleteIqCheckInSnapshot = vi.mocked(upsertAthleteIqCheckInSnapshot);
const mockedGetChildById = vi.mocked(getChildById);
const mockedGetHabitRecordByAthleteIdAndDate = vi.mocked(getHabitRecordByAthleteIdAndDate);
const mockedUpsertHabitRecord = vi.mocked(upsertHabitRecord);
const mockedEnsureCanonicalAthleteProfileForUser = vi.mocked(ensureCanonicalAthleteProfileForUser);

const athleteId = "507f1f77bcf86cd799439011";

describe("shared daily state bridge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedCanOpenProductSurface.mockReturnValue(true);
    mockedCanAccessHabigoalAthlete.mockResolvedValue(true);
    mockedCanAccessAthleteIqAthlete.mockResolvedValue(true);
    mockedGetChildById.mockResolvedValue({ _id: athleteId, name: "Haho Athlete" } as Awaited<ReturnType<typeof getChildById>>);
    mockedGetAthleteIqCheckInSnapshot.mockResolvedValue(null);
    mockedGetHabitRecordByAthleteIdAndDate.mockResolvedValue(null);
    mockedUpsertAthleteIqCheckInSnapshot.mockResolvedValue({ id: "check-in-1" } as Awaited<ReturnType<typeof upsertAthleteIqCheckInSnapshot>>);
    mockedUpsertHabitRecord.mockResolvedValue({ _id: "habit-1" } as Awaited<ReturnType<typeof upsertHabitRecord>>);
  });

  it("projects canonical Athlete IQ check-in and habit records as Habigoal daily state", async () => {
    mockedGetAthleteIqCheckInSnapshot.mockResolvedValue({
      athleteId,
      localDate: "2026-06-27",
      mode: "lifestyle",
      timezone: "Europe/Budapest",
      values: {
        fatigue: { rawValue: 3, normalizedValue: 22, sourceLabel: "user_input" },
        mood: { rawValue: 8, normalizedValue: 78, sourceLabel: "user_input" },
        pain: { rawValue: 2, normalizedValue: 11, sourceLabel: "user_input" },
        sleepQuality: { rawValue: 7, normalizedValue: 67, sourceLabel: "user_input" }
      },
      missingFields: [],
      sourceLabels: {},
      submittedAt: "2026-06-27T06:00:00.000Z",
      updatedAt: "2026-06-27T06:00:00.000Z",
      auditHistory: []
    } as Awaited<ReturnType<typeof getAthleteIqCheckInSnapshot>>);
    mockedGetHabitRecordByAthleteIdAndDate.mockResolvedValue({
      _id: "habit-1",
      athleteId,
      date: "2026-06-27",
      statuses: {
        hydration: true,
        mobility: true,
        nutrition: false,
        recoverySession: true,
        sleepBeforeMidnight: false,
        tacticalLearning: true
      },
      createdAt: "2026-06-27T06:00:00.000Z",
      updatedAt: "2026-06-27T06:00:00.000Z"
    });

    const projection = await getSharedDailyState({
      athleteId,
      localDate: "2026-06-27",
      product: "habigoal",
      timezone: "Europe/Budapest",
      user: athleteUser()
    });

    expect(projection.checkIn).toEqual({
      energy: 78,
      mood: 78,
      sleep: 67,
      soreness: 11
    });
    expect(projection.habits.completed).toEqual(["hydrate", "move", "reflect", "study"]);
    expect(projection.status.score).not.toBeNull();
    expect(projection.dataFreshness.sourceCollections).toEqual(["athleteiq_checkins", "habit_records"]);
  });

  it("writes daily values into the shared Athlete IQ lifestyle check-in and habit record", async () => {
    await patchSharedDailyState({
      athleteId,
      habits: ["hydrate", "fuel", "sleep"],
      idempotencyKey: "daily-state-test",
      localDate: "2026-06-27",
      product: "athlete-iq",
      timezone: "Europe/Budapest",
      user: athleteUser(),
      values: {
        energy: 80,
        mood: 60,
        sleep: 70,
        soreness: 30
      }
    });

    expect(mockedUpsertAthleteIqCheckInSnapshot).toHaveBeenCalledWith(expect.objectContaining({
      athleteId,
      idempotencyKey: "daily-state-test",
      localDate: "2026-06-27",
      mode: "lifestyle",
      timezone: "Europe/Budapest"
    }));
    expect(mockedUpsertAthleteIqCheckInSnapshot.mock.calls[0]?.[0].values).toMatchObject({
      fatigue: { rawValue: 3 },
      mood: { rawValue: 6 },
      pain: { rawValue: 4 },
      sleepQuality: { rawValue: 7 },
      stress: { rawValue: 5 }
    });
    expect(mockedUpsertHabitRecord).toHaveBeenCalledWith({
      athleteId,
      date: "2026-06-27",
      statuses: {
        hydration: true,
        mobility: false,
        nutrition: true,
        recoverySession: false,
        sleepBeforeMidnight: true,
        tacticalLearning: false
      }
    });
  });

  it("creates an empty canonical profile for a new athlete without seeded daily data", async () => {
    mockedEnsureCanonicalAthleteProfileForUser.mockResolvedValue({
      athlete: { _id: athleteId, name: "New Athlete" },
      created: true,
      linked: true,
      profileState: "empty"
    } as Awaited<ReturnType<typeof ensureCanonicalAthleteProfileForUser>>);

    const projection = await getSharedDailyState({
      product: "habigoal",
      user: athleteUser({ athleteId: undefined })
    });

    expect(projection.athleteId).toBe(athleteId);
    expect(projection.checkIn).toEqual({ energy: null, mood: null, sleep: null, soreness: null });
    expect(projection.status.score).toBeNull();
    expect(projection.habits.completed).toEqual([]);
  });

  it("blocks access when the selected product entitlement is missing", async () => {
    mockedCanOpenProductSurface.mockReturnValue(false);

    await expect(getSharedDailyState({
      athleteId,
      product: "athlete-iq",
      user: athleteUser()
    })).rejects.toMatchObject(new SharedDailyStateError("PRODUCT_ACCESS_DENIED", "athlete-iq access is not enabled"));
  });
});

function athleteUser(patch: Partial<AuthUser> = {}): AuthUser {
  return {
    email: "athlete@example.com",
    name: "Athlete",
    primaryRole: "athlete",
    roles: ["athlete"],
    athleteId,
    productEntitlements: {
      habigoal: { enabled: true, reason: "aiq_member" },
      athleteIq: { enabled: true, reason: "pro_athlete_membership" }
    },
    teamIds: [],
    ...patch
  };
}
