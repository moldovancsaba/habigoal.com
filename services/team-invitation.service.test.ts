import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/repositories/team.repository", () => ({
  getTeamById: vi.fn(),
  addAthleteToTeam: vi.fn(async () => null),
  addTrainerToTeam: vi.fn(async () => null)
}));
vi.mock("@/repositories/team-invitation.repository", () => ({
  findPendingInvitation: vi.fn(async () => null),
  insertInvitation: vi.fn(async (doc) => ({ _id: "inv1", ...doc })),
  getInvitationById: vi.fn(),
  updateInvitationStatus: vi.fn(async (id, status) => ({ _id: id, status })),
  listInvitationsByTeam: vi.fn(async () => []),
  listPendingInvitationsByEmail: vi.fn(async () => [])
}));

import { addAthleteToTeam, addTrainerToTeam, getTeamById } from "@/repositories/team.repository";
import { findPendingInvitation, getInvitationById, insertInvitation, updateInvitationStatus } from "@/repositories/team-invitation.repository";
import { acceptTeamInvitation, canManageTeam, createTeamInvitation, InvitationError, revokeTeamInvitation } from "@/services/team-invitation.service";
import type { AuthUser } from "@/lib/access";

const team = { _id: "t1", name: "U14", trainerEmails: ["coach@club.com"], athleteIds: [], createdAt: "", updatedAt: "" };

function actor(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    email: "coach@club.com",
    name: "Coach",
    roles: ["trainer"],
    primaryRole: "trainer",
    productEntitlements: { habigoal: { enabled: true }, athleteIq: { enabled: true } },
    teamIds: [],
    ...overrides
  } as AuthUser;
}

describe("canManageTeam", () => {
  it("allows admins, team trainers, and assigned trainers; rejects others", () => {
    expect(canManageTeam(actor({ primaryRole: "admin", roles: ["admin"] }), team)).toBe(true);
    expect(canManageTeam(actor(), team)).toBe(true);
    expect(canManageTeam(actor({ email: "other@club.com", teamIds: ["t1"] }), team)).toBe(true);
    expect(canManageTeam(actor({ email: "other@club.com", roles: ["trainer"], teamIds: [] }), team)).toBe(false);
    expect(canManageTeam(actor({ primaryRole: "athlete", roles: ["athlete"], email: "a@club.com" }), team)).toBe(false);
  });
});

describe("createTeamInvitation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getTeamById).mockResolvedValue(team as never);
    vi.mocked(findPendingInvitation).mockResolvedValue(null);
  });

  it("rejects an invalid email", async () => {
    await expect(createTeamInvitation({ actor: actor(), teamId: "t1", email: "nope", role: "athlete" })).rejects.toThrow(InvitationError);
  });

  it("forbids a trainer who does not manage the team", async () => {
    await expect(
      createTeamInvitation({ actor: actor({ email: "stranger@club.com" }), teamId: "t1", email: "kid@club.com", role: "athlete" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("creates a pending athlete invitation with a token", async () => {
    const invite = await createTeamInvitation({ actor: actor(), teamId: "t1", email: "Kid@Club.com", role: "athlete" });
    expect(invite.email).toBe("kid@club.com");
    expect(invite.status).toBe("pending");
    expect(invite.token).toBeTruthy();
    expect(insertInvitation).toHaveBeenCalledOnce();
  });

  it("reuses an existing pending invitation instead of duplicating", async () => {
    vi.mocked(findPendingInvitation).mockResolvedValue({ _id: "existing" } as never);
    const invite = await createTeamInvitation({ actor: actor(), teamId: "t1", email: "kid@club.com", role: "athlete" });
    expect(invite._id).toBe("existing");
    expect(insertInvitation).not.toHaveBeenCalled();
  });

  it("rejects inviting a trainer already on the team", async () => {
    await expect(
      createTeamInvitation({ actor: actor(), teamId: "t1", email: "coach@club.com", role: "trainer" })
    ).rejects.toMatchObject({ code: "ALREADY_MEMBER" });
  });
});

describe("acceptTeamInvitation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("forbids accepting an invitation addressed to someone else", async () => {
    vi.mocked(getInvitationById).mockResolvedValue({ _id: "i1", teamId: "t1", email: "kid@club.com", role: "athlete", status: "pending" } as never);
    await expect(
      acceptTeamInvitation({ actor: actor({ email: "other@club.com", primaryRole: "athlete", roles: ["athlete"], athleteId: "a1" }), invitationId: "i1" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("requires an athlete profile before joining as an athlete", async () => {
    vi.mocked(getInvitationById).mockResolvedValue({ _id: "i1", teamId: "t1", email: "kid@club.com", role: "athlete", status: "pending" } as never);
    await expect(
      acceptTeamInvitation({ actor: actor({ email: "kid@club.com", primaryRole: "athlete", roles: ["athlete"], athleteId: undefined }), invitationId: "i1" })
    ).rejects.toMatchObject({ code: "ATHLETE_PROFILE_REQUIRED" });
  });

  it("adds the athlete to the team and marks the invitation accepted", async () => {
    vi.mocked(getInvitationById).mockResolvedValue({ _id: "i1", teamId: "t1", email: "kid@club.com", role: "athlete", status: "pending" } as never);
    const result = await acceptTeamInvitation({ actor: actor({ email: "kid@club.com", primaryRole: "athlete", roles: ["athlete"], athleteId: "a1" }), invitationId: "i1" });
    expect(addAthleteToTeam).toHaveBeenCalledWith("t1", "a1");
    expect(updateInvitationStatus).toHaveBeenCalledWith("i1", "accepted");
    expect(result.status).toBe("accepted");
  });

  it("adds a trainer by email when accepting a trainer invitation", async () => {
    vi.mocked(getInvitationById).mockResolvedValue({ _id: "i2", teamId: "t1", email: "asst@club.com", role: "trainer", status: "pending" } as never);
    await acceptTeamInvitation({ actor: actor({ email: "asst@club.com" }), invitationId: "i2" });
    expect(addTrainerToTeam).toHaveBeenCalledWith("t1", "asst@club.com");
  });

  it("rejects a non-pending invitation", async () => {
    vi.mocked(getInvitationById).mockResolvedValue({ _id: "i1", teamId: "t1", email: "kid@club.com", role: "athlete", status: "accepted" } as never);
    await expect(
      acceptTeamInvitation({ actor: actor({ email: "kid@club.com", athleteId: "a1" }), invitationId: "i1" })
    ).rejects.toMatchObject({ code: "NOT_PENDING" });
  });
});

describe("revokeTeamInvitation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lets a team manager revoke and rejects non-managers", async () => {
    vi.mocked(getInvitationById).mockResolvedValue({ _id: "i1", teamId: "t1", email: "kid@club.com", role: "athlete", status: "pending" } as never);
    vi.mocked(getTeamById).mockResolvedValue(team as never);
    const result = await revokeTeamInvitation({ actor: actor(), invitationId: "i1" });
    expect(result.status).toBe("revoked");

    await expect(
      revokeTeamInvitation({ actor: actor({ email: "stranger@club.com" }), invitationId: "i1" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
