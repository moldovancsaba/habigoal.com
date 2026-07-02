import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSession } from "@/lib/session";
import { findUserByEmail } from "@/repositories/user.repository";
import { canAccessHabigoalAthlete, getAuthUser, type AuthUser } from "@/lib/access";

vi.mock("@/config/env", () => ({
  env: {
    habigoalEnforceAuth: true
  }
}));

vi.mock("@/lib/session", () => ({
  getSession: vi.fn()
}));

vi.mock("@/repositories/user.repository", () => ({
  findUserByEmail: vi.fn()
}));

vi.mock("@/repositories/team.repository", () => ({
  getTeamById: vi.fn(),
  listTeamsByAthleteId: vi.fn(),
  listTeamsByTrainerEmail: vi.fn()
}));

const mockedGetSession = vi.mocked(getSession);
const mockedFindUserByEmail = vi.mocked(findUserByEmail);

describe("auth access resolution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedFindUserByEmail.mockResolvedValue({
      id: "user-1",
      email: "same-user@example.com",
      name: "Same User",
      roles: ["athlete", "trainer"],
      athleteId: "athlete-1",
      teamIds: ["team-1"]
    });
  });

  it("uses the selected athlete session role when a user can access both products", async () => {
    mockedGetSession.mockResolvedValue(session("athlete"));

    const user = await getAuthUser();

    expect(user?.roles).toEqual(["athlete", "trainer"]);
    expect(user?.primaryRole).toBe("athlete");
    expect(user?.athleteId).toBe("athlete-1");
    expect(user?.teamIds).toEqual(["team-1"]);
  });

  it("uses the selected trainer session role when the same user opens Athlete IQ", async () => {
    mockedGetSession.mockResolvedValue(session("trainer"));

    const user = await getAuthUser();

    expect(user?.roles).toEqual(["athlete", "trainer"]);
    expect(user?.primaryRole).toBe("trainer");
  });

  it("keeps Habigoal athlete access personal even for professional users", async () => {
    const trainerUser: AuthUser = {
      email: "coach@example.com",
      name: "Coach",
      roles: ["trainer"],
      primaryRole: "trainer",
      athleteId: "personal-profile",
      productEntitlements: {
        habigoal: { enabled: true, reason: "self_registered" },
        athleteIq: { enabled: false }
      },
      teamIds: ["team-1"]
    };

    await expect(canAccessHabigoalAthlete(trainerUser, "personal-profile")).resolves.toBe(true);
    await expect(canAccessHabigoalAthlete(trainerUser, "assigned-athlete")).resolves.toBe(false);
  });
});

function session(role: string) {
  return {
    userId: "user-1",
    email: "same-user@example.com",
    name: "Same User",
    role,
    expires: Date.now() + 60_000
  };
}
