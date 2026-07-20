import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSession } from "@/lib/session";
import { findUserByEmail } from "@/repositories/user.repository";
import {
  canAccessHabigoalAthlete,
  getAuthUser,
  requireAdminApiUser,
  requireAthleteIqApiUser,
  requireAthleteIqTrainerApiUser,
  requireHabigoalApiUser,
  type AuthUser
} from "@/lib/access";

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

  it("enforces requested product entitlements at auth resolution", async () => {
    mockedFindUserByEmail.mockResolvedValue({
      id: "user-habigoal-only",
      email: "same-user@example.com",
      name: "Same User",
      roles: ["athlete"],
      athleteId: "athlete-1",
      productEntitlements: {
        habigoal: { enabled: true, reason: "self_registered" },
        athleteIq: { enabled: false }
      },
      teamIds: []
    });
    mockedGetSession.mockResolvedValue(session("athlete"));

    await expect(getAuthUser({ productSurface: "habigoal" })).resolves.toMatchObject({ email: "same-user@example.com" });
    await expect(getAuthUser({ productSurface: "athlete-iq" })).resolves.toBeNull();
  });

  it("resolves a typed Habigoal API principal from Habigoal entitlement", async () => {
    mockedGetSession.mockResolvedValue(session("trainer"));

    await expect(requireHabigoalApiUser()).resolves.toMatchObject({
      email: "same-user@example.com",
      persona: "habigoal_user",
      productSurface: "habigoal"
    });
  });

  it("resolves Athlete IQ athlete and trainer API principals only from Athlete IQ entitlement", async () => {
    mockedGetSession.mockResolvedValue(session("athlete"));

    await expect(requireAthleteIqApiUser()).resolves.toMatchObject({
      persona: "athlete",
      productSurface: "athlete-iq"
    });

    mockedGetSession.mockResolvedValue(session("trainer"));
    await expect(requireAthleteIqTrainerApiUser()).resolves.toMatchObject({
      persona: "trainer",
      productSurface: "athlete-iq"
    });
  });

  it("does not resolve a trainer/admin API principal from an athlete-only user", async () => {
    mockedFindUserByEmail.mockResolvedValue({
      id: "athlete-only",
      email: "athlete@example.com",
      name: "Athlete",
      roles: ["athlete"],
      athleteId: "athlete-1",
      productEntitlements: {
        habigoal: { enabled: true, reason: "self_registered" },
        athleteIq: { enabled: true, reason: "pro_athlete_membership" }
      },
      teamIds: []
    });
    mockedGetSession.mockResolvedValue(session("athlete"));

    await expect(requireAthleteIqTrainerApiUser()).resolves.toBeNull();
    await expect(requireAdminApiUser()).resolves.toBeNull();
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
