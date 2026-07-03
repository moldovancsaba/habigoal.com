import { describe, expect, it } from "vitest";
import { resolveCheckinShellAccess } from "@/lib/athlete-checkin-access";
import type { AuthUser } from "@/lib/access";

function user(partial: Partial<AuthUser>): AuthUser {
  return {
    email: "u@x.com",
    name: "U",
    roles: [],
    primaryRole: "athlete",
    productEntitlements: {} as never,
    teamIds: [],
    ...partial,
  };
}

describe("resolveCheckinShellAccess (GH-156)", () => {
  it("redirects an anonymous visitor to the app home", () => {
    expect(resolveCheckinShellAccess(null)).toEqual({ ok: false, redirectTo: "/" });
  });

  it("sends a non-athlete (trainer/admin) to the dashboard", () => {
    expect(resolveCheckinShellAccess(user({ roles: ["trainer"], primaryRole: "trainer" }))).toEqual({
      ok: false,
      redirectTo: "/dashboard",
    });
    expect(resolveCheckinShellAccess(user({ roles: ["admin"], primaryRole: "admin" }))).toEqual({
      ok: false,
      redirectTo: "/dashboard",
    });
  });

  it("sends an athlete without a linked profile to the app home", () => {
    expect(resolveCheckinShellAccess(user({ roles: ["athlete"] }))).toEqual({ ok: false, redirectTo: "/" });
  });

  it("admits an athlete with a resolved athleteId", () => {
    expect(resolveCheckinShellAccess(user({ roles: ["athlete"], athleteId: "a1" }))).toEqual({
      ok: true,
      athleteId: "a1",
    });
  });

  it("admits a multi-role user that includes athlete with an athleteId", () => {
    expect(
      resolveCheckinShellAccess(user({ roles: ["trainer", "athlete"], primaryRole: "trainer", athleteId: "a9" }))
    ).toEqual({ ok: true, athleteId: "a9" });
  });
});
