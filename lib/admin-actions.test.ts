import { describe, expect, it } from "vitest";
import {
  validateGovAction,
  computeNextRoles,
  isGovAction,
  isGovAssignableRole,
} from "@/lib/admin-actions";

describe("validateGovAction (GH-152)", () => {
  const valid = { userEmail: "Coach@Example.com", action: "grant_role", scope: "trainer", reason: "promotion" };

  it("accepts a well-formed payload and normalizes the email", () => {
    const result = validateGovAction(valid);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.userEmail).toBe("coach@example.com");
      expect(result.value.action).toBe("grant_role");
      expect(result.value.scope).toBe("trainer");
    }
  });

  it("rejects a missing user email", () => {
    expect(validateGovAction({ ...valid, userEmail: "" })).toMatchObject({ ok: false, field: "userEmail" });
  });

  it("rejects an unknown action", () => {
    expect(validateGovAction({ ...valid, action: "delete_user" })).toMatchObject({ ok: false, field: "action" });
  });

  it("rejects a scope that is not an assignable role (incl. admin)", () => {
    expect(validateGovAction({ ...valid, scope: "admin" })).toMatchObject({ ok: false, field: "scope" });
    expect(validateGovAction({ ...valid, scope: "wizard" })).toMatchObject({ ok: false, field: "scope" });
  });

  it("requires a non-trivial reason", () => {
    expect(validateGovAction({ ...valid, reason: "" })).toMatchObject({ ok: false, field: "reason" });
    expect(validateGovAction({ ...valid, reason: "x" })).toMatchObject({ ok: false, field: "reason" });
  });
});

describe("computeNextRoles (GH-152)", () => {
  it("grants a role and is idempotent", () => {
    expect(computeNextRoles(["athlete"], "grant_role", "trainer").sort()).toEqual(["athlete", "trainer"]);
    expect(computeNextRoles(["trainer"], "grant_role", "trainer")).toEqual(["trainer"]);
  });

  it("revokes a role and is idempotent when absent", () => {
    expect(computeNextRoles(["athlete", "trainer"], "revoke_role", "trainer")).toEqual(["athlete"]);
    expect(computeNextRoles(["athlete"], "revoke_role", "trainer")).toEqual(["athlete"]);
  });
});

describe("governance guards (GH-152)", () => {
  it("isGovAction only allows the supported actions", () => {
    expect(isGovAction("grant_role")).toBe(true);
    expect(isGovAction("revoke_role")).toBe(true);
    expect(isGovAction("suspend_user")).toBe(false);
  });

  it("isGovAssignableRole excludes admin", () => {
    expect(isGovAssignableRole("trainer")).toBe(true);
    expect(isGovAssignableRole("admin")).toBe(false);
  });
});
