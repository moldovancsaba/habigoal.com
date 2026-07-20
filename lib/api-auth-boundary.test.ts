import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAuthUser } from "@/lib/access";
import { jsonError, requireCapability, requireRole } from "@/lib/api";
import { athleteIqJsonError } from "@/lib/athleteiq-api";
import { habigoalJsonError } from "@/lib/habigoal-api";

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

  it("sanitizes internal details from 500 responses", async () => {
    const generic = await jsonError("database password leaked", 500).json();
    const athleteIq = await athleteIqJsonError("UNKNOWN_ERROR", 500, "aiq-test", { details: "stack trace" }).json();
    const habigoal = await habigoalJsonError("UNKNOWN_ERROR", 500, "hbg-test", { details: "stack trace" }).json();

    expect(generic).toEqual({ error: "Internal Server Error", code: "UNKNOWN_ERROR" });
    expect(athleteIq).toEqual({ code: "UNKNOWN_ERROR", messageKey: "athleteiq.errors.UNKNOWN_ERROR", retryable: false, correlationId: "aiq-test" });
    expect(habigoal).toEqual({ ok: false, code: "UNKNOWN_ERROR", retryable: false, correlationId: "hbg-test" });
  });
});
