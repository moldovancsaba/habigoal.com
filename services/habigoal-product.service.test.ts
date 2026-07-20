import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAthleteIqCheckInSnapshot } from "@/repositories/athleteiq-check-in.repository";
import { getChildById } from "@/repositories/child.repository";
import { getHabitRecordByAthleteIdAndDate } from "@/repositories/habit-records.repository";
import { ensureCanonicalAthleteProfileForUser } from "@/services/shared-athlete-profile.service";
import { getHabigoalTodayProjection } from "@/services/habigoal-product.service";
import type { AuthUser } from "@/lib/access";

vi.mock("@/lib/habigoal-api", () => ({
  createHabigoalCorrelationId: () => "hbg-test",
  logHabigoalEvent: vi.fn()
}));

vi.mock("@/repositories/athleteiq-check-in.repository", () => ({
  getAthleteIqCheckInSnapshot: vi.fn()
}));

vi.mock("@/repositories/child.repository", () => ({
  getChildById: vi.fn()
}));

vi.mock("@/repositories/habit-records.repository", () => ({
  getHabitRecordByAthleteIdAndDate: vi.fn()
}));

vi.mock("@/services/shared-athlete-profile.service", () => ({
  ensureCanonicalAthleteProfileForUser: vi.fn()
}));

const athleteId = "507f1f77bcf86cd799439011";
const mockedGetAthleteIqCheckInSnapshot = vi.mocked(getAthleteIqCheckInSnapshot);
const mockedGetChildById = vi.mocked(getChildById);
const mockedGetHabitRecordByAthleteIdAndDate = vi.mocked(getHabitRecordByAthleteIdAndDate);
const mockedEnsureCanonicalAthleteProfileForUser = vi.mocked(ensureCanonicalAthleteProfileForUser);

describe("Habigoal product projection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetAthleteIqCheckInSnapshot.mockResolvedValue(null);
    mockedGetHabitRecordByAthleteIdAndDate.mockResolvedValue(null);
    mockedGetChildById.mockResolvedValue({ _id: athleteId, name: "Existing Personal Profile" } as Awaited<ReturnType<typeof getChildById>>);
    mockedEnsureCanonicalAthleteProfileForUser.mockResolvedValue({
      athlete: { _id: athleteId, name: "Coach Personal Habits" },
      created: true,
      linked: true,
      profileState: "empty"
    } as Awaited<ReturnType<typeof ensureCanonicalAthleteProfileForUser>>);
  });

  it("creates a personal routine profile for trainer Habigoal sessions", async () => {
    const projection = await getHabigoalTodayProjection({
      user: user({
        athleteId: undefined,
        email: "coach@example.com",
        name: "Coach",
        primaryRole: "trainer",
        roles: ["trainer"],
        productEntitlements: {
          habigoal: { enabled: true, reason: "self_registered" },
          athleteIq: { enabled: false }
        },
        teamIds: ["team-1"]
      })
    });

    expect(mockedEnsureCanonicalAthleteProfileForUser).toHaveBeenCalledWith({
      user: expect.objectContaining({
        email: "coach@example.com",
        primaryRole: "trainer"
      })
    });
    expect(mockedGetChildById).not.toHaveBeenCalled();
    expect(projection.athleteId).toBe(athleteId);
    expect(projection.athleteName).toBe("Coach Personal Habits");
    expect(projection.score).toBeNull();
    expect(projection.surface).toBe("habigoal");
    expect(projection.version).toBe("habigoal-today-v1");
    expect(projection.shareableSummary.rule).toBe("professional_entitlement_assignment_and_consent_required");
  });

  it("uses the signed-in user's linked routine profile when one exists", async () => {
    const projection = await getHabigoalTodayProjection({
      user: user({
        athleteId,
        primaryRole: "trainer",
        roles: ["trainer"]
      })
    });

    expect(mockedGetChildById).toHaveBeenCalled();
    expect(mockedEnsureCanonicalAthleteProfileForUser).not.toHaveBeenCalled();
    expect(projection.athleteName).toBe("Existing Personal Profile");
  });

  it("returns a Habigoal-only DTO without Athlete IQ module, trainer, or team fields", async () => {
    const projection = await getHabigoalTodayProjection({ user: user() });
    const serialized = JSON.stringify(projection);

    expect(projection.surface).toBe("habigoal");
    expect(serialized).not.toMatch(/athleteIq|Athlete IQ|aiq-|trainerDashboard|teamId|teamName|coachAction|moduleRegistry/i);
  });
});

function user(patch: Partial<AuthUser> = {}): AuthUser {
  return {
    email: "person@example.com",
    name: "Person",
    primaryRole: "athlete",
    roles: ["athlete"],
    athleteId,
    productEntitlements: {
      habigoal: { enabled: true, reason: "self_registered" },
      athleteIq: { enabled: false }
    },
    teamIds: [],
    ...patch
  };
}
