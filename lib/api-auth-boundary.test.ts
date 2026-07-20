import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAuthUser } from "@/lib/access";
import { requireCapability, requireRole } from "@/lib/api";

vi.mock("@/lib/access", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/access")>();
  return {
    ...actual,
    getAuthUser: vi.fn()
  };
});

const mockedGetAuthUser = vi.mocked(getAuthUser);

describe("API authorization boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects a spoofed role header when no server-side user exists", async () => {
    mockedGetAuthUser.mockResolvedValue(null);

    const response = await requireRole(
      new Request("http://localhost/api/admin/actions", {
        headers: { "x-habigoal-role": "admin" }
      }),
      ["admin"]
    );

    expect(response?.status).toBe(401);
  });

  it("uses server-side roles instead of a privileged request header", async () => {
    mockedGetAuthUser.mockResolvedValue({
      email: "athlete@example.com",
      name: "Athlete",
      roles: ["athlete"],
      primaryRole: "athlete",
      productEntitlements: {
        habigoal: { enabled: true, reason: "self_registered" },
        athleteIq: { enabled: false }
      },
      teamIds: []
    });

    const response = await requireRole(
      new Request("http://localhost/api/admin/actions", {
        headers: { "x-habigoal-role": "admin" }
      }),
      ["admin"]
    );

    expect(response?.status).toBe(403);
  });

  it("checks capabilities from server-side roles only", async () => {
    mockedGetAuthUser.mockResolvedValue({
      email: "athlete@example.com",
      name: "Athlete",
      roles: ["athlete"],
      primaryRole: "athlete",
      productEntitlements: {
        habigoal: { enabled: true, reason: "self_registered" },
        athleteIq: { enabled: false }
      },
      teamIds: []
    });

    const response = await requireCapability(
      new Request("http://localhost/api/coach-actions", {
        headers: { "x-habigoal-role": "admin" }
      }),
      "queue:admin"
    );

    expect(response?.status).toBe(403);
  });
});
