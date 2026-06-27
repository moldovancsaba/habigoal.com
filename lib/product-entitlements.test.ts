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

  it("keeps an athlete persona login Habigoal-only by default", () => {
    const entitlements = resolvePersonaLoginEntitlements({
      existingRoles: [],
      requestedRoles: ["athlete"],
      now: "2026-06-27T08:00:00.000Z"
    });

    expect(entitlements.habigoal.enabled).toBe(true);
    expect(entitlements.athleteIq.enabled).toBe(false);
  });

  it("grants Athlete IQ athlete access when the athlete registers through the AIQ surface", () => {
    const entitlements = resolvePersonaLoginEntitlements({
      existingRoles: [],
      requestedRoles: ["athlete"],
      requestedSurface: "athlete-iq",
      now: "2026-06-27T08:00:00.000Z"
    });

    expect(entitlements.habigoal.enabled).toBe(true);
    expect(entitlements.habigoal.reason).toBe("aiq_member");
    expect(entitlements.athleteIq.enabled).toBe(true);
    expect(entitlements.athleteIq.reason).toBe("pro_athlete_membership");
  });

  it("provisions Athlete IQ access when the pseudo-login persona is trainer", () => {
    const entitlements = resolvePersonaLoginEntitlements({
      existingRoles: [],
      requestedRoles: ["trainer"],
      now: "2026-06-27T08:00:00.000Z"
    });

    expect(entitlements.habigoal.enabled).toBe(true);
    expect(entitlements.habigoal.reason).toBe("aiq_member");
    expect(entitlements.athleteIq.enabled).toBe(true);
    expect(entitlements.athleteIq.reason).toBe("trainer_assignment");
  });

  it("upgrades an existing Habigoal-only account when the user selects trainer persona", () => {
    const entitlements = resolvePersonaLoginEntitlements({
      existingProductEntitlements: createSelfRegisteredEntitlements("2026-06-27T08:00:00.000Z"),
      existingRoles: ["athlete"],
      requestedRoles: ["trainer"],
      now: "2026-06-27T09:00:00.000Z"
    });

    expect(entitlements.habigoal.enabled).toBe(true);
    expect(entitlements.habigoal.reason).toBe("aiq_member");
    expect(entitlements.athleteIq.enabled).toBe(true);
    expect(entitlements.athleteIq.grantedAt).toBe("2026-06-27T09:00:00.000Z");
    expect(entitlements.athleteIq.reason).toBe("trainer_assignment");
  });
});
