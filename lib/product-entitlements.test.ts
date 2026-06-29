import { describe, expect, it } from "vitest";
import {
  createSelfRegisteredEntitlements,
  hasProductEntitlement,
  projectEntitlementsForSurface,
  resolvePersonaLoginEntitlements,
  resolveProductEntitlements
} from "./product-entitlements";
import type { ProductEntitlements } from "./product-entitlements";

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

describe("surface entitlement projection (product boundary #432)", () => {
  // A professional user (Habigoal granted via AIQ membership, plus a live AIQ
  // entitlement with a reason code that must never reach a consumer client).
  const professional: ProductEntitlements = {
    habigoal: { enabled: true, grantedAt: "2026-06-27T08:00:00.000Z", reason: "aiq_member" },
    athleteIq: { enabled: true, grantedAt: "2026-06-27T08:00:00.000Z", reason: "trainer_assignment" }
  };

  it("hides Athlete IQ and all reason codes from the consumer (Habigoal) surface", () => {
    const scoped = projectEntitlementsForSurface(professional, "habigoal");

    expect(scoped).toEqual({ habigoal: { enabled: true } });
    // No professional product key, no reason codes, no grant timestamps leak.
    expect("athleteIq" in scoped).toBe(false);
    expect(JSON.stringify(scoped)).not.toContain("trainer_assignment");
    expect(JSON.stringify(scoped)).not.toContain("grantedAt");
  });

  it("exposes only enabled flags (no reason codes) on the Athlete IQ surface", () => {
    const scoped = projectEntitlementsForSurface(professional, "athlete-iq");

    expect(scoped).toEqual({ habigoal: { enabled: true }, athleteIq: { enabled: true } });
    expect(JSON.stringify(scoped)).not.toContain("trainer_assignment");
  });

  it("treats missing entitlements as disabled rather than throwing", () => {
    expect(projectEntitlementsForSurface(undefined, "habigoal")).toEqual({ habigoal: { enabled: false } });
    expect(projectEntitlementsForSurface(null, "athlete-iq")).toEqual({
      habigoal: { enabled: false },
      athleteIq: { enabled: false }
    });
  });

  it("never reports Athlete IQ enabled to a consumer even when the user has it", () => {
    const scoped = projectEntitlementsForSurface(professional, "habigoal") as { athleteIq?: { enabled: boolean } };
    expect(scoped.athleteIq).toBeUndefined();
  });
});
