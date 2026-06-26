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

  it("merges a selected persona role into an existing user instead of replacing roles", async () => {
    const updateOne = vi.fn().mockResolvedValue({ acknowledged: true });
    const findOne = vi
      .fn()
      .mockResolvedValueOnce({
        _id: { toString: () => "user-1" },
        email: "same-user@example.com",
        name: "Same User",
        roles: ["athlete"],
        athleteId: "athlete-1",
        teamIds: ["team-1"],
        createdAt: "2026-06-27T08:00:00.000Z",
        updatedAt: "2026-06-27T08:00:00.000Z"
      })
      .mockResolvedValueOnce({
        _id: { toString: () => "user-1" },
        email: "same-user@example.com",
        name: "Same User",
        roles: ["athlete", "trainer"],
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
      roles: ["trainer"]
    });

    expect(updateOne).toHaveBeenCalledWith(
      { email: "same-user@example.com" },
      expect.objectContaining({
        $set: expect.objectContaining({
          email: "same-user@example.com",
          name: "Same User",
          roles: ["athlete", "trainer"]
        })
      }),
      { upsert: true }
    );
    expect(updateOne.mock.calls[0][1].$set).not.toHaveProperty("athleteId");
    expect(updateOne.mock.calls[0][1].$set).not.toHaveProperty("teamIds");
    expect(user?.roles).toEqual(["athlete", "trainer"]);
    expect(user?.athleteId).toBe("athlete-1");
    expect(user?.teamIds).toEqual(["team-1"]);
  });
});
