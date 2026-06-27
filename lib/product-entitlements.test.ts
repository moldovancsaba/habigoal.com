import { describe, expect, it } from "vitest";
import {
  createSelfRegisteredEntitlements,
  hasProductEntitlement,
  resolvePersonaLoginEntitlements,
  resolveProductEntitlements
} from "./product-entitlements";

describe("product entitlement contract", () => {
  it("grants self-registered users Habigoal but not Athlete IQ", () => {
    const entitlements = createSelfRegisteredEntitlements("2026-06-27T08:00:00.000Z");

    expect(hasProductEntitlement(entitlements, "habigoal")).toBe(true);
    expect(hasProductEntitlement(entitlements, "athlete-iq")).toBe(false);
  });

  it("preserves legacy professional users when explicit entitlements are absent", () => {
    const entitlements = resolveProductEntitlements({ roles: ["trainer"] });

    expect(entitlements.habigoal.enabled).toBe(true);
    expect(entitlements.habigoal.reason).toBe("aiq_member");
    expect(entitlements.athleteIq.enabled).toBe(true);
    expect(entitlements.athleteIq.reason).toBe("trainer_assignment");
  });

  it("does not upgrade a new trainer persona login to Athlete IQ without explicit professional entitlement", () => {
    const entitlements = resolvePersonaLoginEntitlements({
      existingRoles: [],
      now: "2026-06-27T08:00:00.000Z"
    });

    expect(entitlements.habigoal.enabled).toBe(true);
    expect(entitlements.athleteIq.enabled).toBe(false);
  });
});
