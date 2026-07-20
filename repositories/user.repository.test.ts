import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDatabase } from "@/lib/mongodb";
import { upsertPersonaLoginUser } from "@/repositories/user.repository";

vi.mock("@/lib/mongodb", () => ({
  getDatabase: vi.fn()
}));

const mockedGetDatabase = vi.mocked(getDatabase);

describe("user repository persona login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not write requested professional roles without trusted Athlete IQ entitlement", async () => {
    const updateOne = vi.fn().mockResolvedValue({ acknowledged: true });
    const findOne = vi
      .fn()
      .mockResolvedValueOnce({
        _id: { toString: () => "user-1" },
        email: "same-user@example.com",
        name: "Same User",
        roles: ["athlete"],
        productEntitlements: {
          habigoal: { enabled: true, reason: "self_registered" },
          athleteIq: { enabled: false }
        },
        athleteId: "athlete-1",
        teamIds: ["team-1"],
        createdAt: "2026-06-27T08:00:00.000Z",
        updatedAt: "2026-06-27T08:00:00.000Z"
      })
      .mockResolvedValueOnce({
        _id: { toString: () => "user-1" },
        email: "same-user@example.com",
        name: "Same User",
        roles: ["athlete"],
        productEntitlements: {
          habigoal: { enabled: true, reason: "self_registered" },
          athleteIq: { enabled: false }
        },
        athleteId: "athlete-1",
        teamIds: ["team-1"],
        createdAt: "2026-06-27T08:00:00.000Z",
        updatedAt: "2026-06-27T08:01:00.000Z"
      });
    mockedGetDatabase.mockResolvedValue({
      collection: () => ({
        findOne,
        updateOne
      })
    } as unknown as Awaited<ReturnType<typeof getDatabase>>);

    const user = await upsertPersonaLoginUser({
      email: "Same-User@Example.com",
      name: "Same User",
      productSurface: "athlete-iq",
      roles: ["trainer"]
    });

    expect(findOne).toHaveBeenCalledWith({
      $or: [
        { normalizedEmail: "same-user@example.com" },
        { email: "same-user@example.com" }
      ]
    });
    const [filter, update, options] = updateOne.mock.calls[0];
    expect(filter).toEqual({ _id: expect.objectContaining({ toString: expect.any(Function) }) });
    expect(options).toEqual({ upsert: true });
    expect(update.$set).toMatchObject({
      email: "same-user@example.com",
      normalizedEmail: "same-user@example.com",
      name: "Same User",
      productEntitlements: {
        habigoal: { enabled: true, reason: "self_registered" },
        athleteIq: { enabled: false }
      },
      roles: ["athlete"]
    });
    expect(update.$set).not.toHaveProperty("athleteId");
    expect(update.$set).not.toHaveProperty("teamIds");
    expect(user?.roles).toEqual(["athlete"]);
    expect(user?.athleteId).toBe("athlete-1");
    expect(user?.teamIds).toEqual(["team-1"]);
  });

  it("preserves requested professional roles when stored Athlete IQ entitlement is trusted", async () => {
    const updateOne = vi.fn().mockResolvedValue({ acknowledged: true });
    const findOne = vi
      .fn()
      .mockResolvedValueOnce({
        _id: { toString: () => "user-2" },
        email: "coach@example.com",
        name: "Coach",
        roles: ["athlete"],
        productEntitlements: {
          habigoal: { enabled: true, reason: "aiq_member" },
          athleteIq: { enabled: true, reason: "trainer_assignment" }
        },
        teamIds: [],
        createdAt: "2026-06-27T08:00:00.000Z",
        updatedAt: "2026-06-27T08:00:00.000Z"
      })
      .mockResolvedValueOnce({
        _id: { toString: () => "user-2" },
        email: "coach@example.com",
        name: "Coach",
        roles: ["athlete", "trainer"],
        productEntitlements: {
          habigoal: { enabled: true, reason: "aiq_member" },
          athleteIq: { enabled: true, reason: "trainer_assignment" }
        },
        teamIds: [],
        createdAt: "2026-06-27T08:00:00.000Z",
        updatedAt: "2026-06-27T08:01:00.000Z"
      });
    mockedGetDatabase.mockResolvedValue({
      collection: () => ({
        findOne,
        updateOne
      })
    } as unknown as Awaited<ReturnType<typeof getDatabase>>);

    const user = await upsertPersonaLoginUser({
      email: "Coach@Example.com",
      name: "Coach",
      productSurface: "athlete-iq",
      roles: ["trainer", "athlete"]
    });

    expect(updateOne.mock.calls[0][1].$set.roles).toEqual(["athlete", "trainer"]);
    expect(updateOne.mock.calls[0][1].$set.productEntitlements.athleteIq).toMatchObject({
      enabled: true,
      reason: "trainer_assignment"
    });
    expect(user?.roles).toEqual(["athlete", "trainer"]);
  });
});
