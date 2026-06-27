import { describe, expect, it } from "vitest";
import { normalizeOnboardingRoute, resolveOnboardingModules } from "@/lib/onboarding";
import type { AuthUser } from "@/lib/access";

const athleteUser: AuthUser = {
  email: "athlete@example.com",
  name: "Athlete",
  productEntitlements: {
    habigoal: { enabled: true, reason: "self_registered" },
    athleteIq: { enabled: false }
  },
  roles: ["athlete"],
  primaryRole: "athlete",
  athleteId: "athlete-1",
  teamIds: []
};

describe("onboarding", () => {
  it("normalizes locale-prefixed routes", () => {
    expect(normalizeOnboardingRoute("/en/athletes/123")).toBe("/athletes/123");
    expect(normalizeOnboardingRoute("/hu/dashboard")).toBe("/dashboard");
  });

  it("filters modules by role and route", () => {
    const modules = resolveOnboardingModules(athleteUser, "/en/athletes/123", []);
    expect(modules.map((module) => module.id)).toEqual(["athlete-first-login-baseline"]);
  });

  it("marks dismissed modules as dismissed", () => {
    const modules = resolveOnboardingModules(athleteUser, "/en/athletes/123", [
      {
        userEmail: athleteUser.email,
        moduleId: "athlete-first-login-baseline",
        event: "dismissed",
        route: "/en/athletes/123",
        createdAt: "2026-06-26T07:00:00.000Z"
      }
    ]);
    expect(modules[0]?.state).toBe("dismissed");
  });

  it("keeps a module active when only one checklist step is completed", () => {
    const modules = resolveOnboardingModules(athleteUser, "/en/athletes/123", [
      {
        userEmail: athleteUser.email,
        moduleId: "athlete-first-login-baseline",
        event: "completed",
        route: "/en/athletes/123",
        stepId: "complete-check-in",
        createdAt: "2026-06-26T07:00:00.000Z"
      }
    ]);
    expect(modules[0]?.state).toBe("eligible");
    expect(modules[0]?.completedStepIds).toEqual(["complete-check-in"]);
  });
});
