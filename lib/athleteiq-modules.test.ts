import { describe, expect, it } from "vitest";
import { GET as listModules } from "@/app/api/athleteiq/modules/route";
import { GET as getModule } from "@/app/api/athleteiq/modules/[key]/route";
import { ATHLETEIQ_MODULE_REGISTRY, ATHLETEIQ_MODULE_REGISTRY_VERSION, resolveAthleteIqModulesForUser, validateAthleteIqModuleRegistry } from "@/lib/athleteiq-modules";
import type { AuthUser } from "@/lib/access";

const athleteUser: AuthUser = {
  email: "athlete@example.com",
  name: "Athlete",
  roles: ["athlete"],
  primaryRole: "athlete",
  athleteId: "athlete-1",
  teamIds: []
};

const trainerUser: AuthUser = {
  email: "trainer@example.com",
  name: "Trainer",
  roles: ["trainer"],
  primaryRole: "trainer",
  teamIds: ["team-1"]
};

describe("AthleteIQ module registry", () => {
  it("contains the canonical module keys without duplicates", () => {
    expect(ATHLETEIQ_MODULE_REGISTRY.map((module) => module.key)).toEqual([
      "readiness",
      "mental_edge",
      "pain_safety",
      "habits",
      "daily_plan",
      "session_log",
      "calendar",
      "reflection",
      "coach_alerts",
      "parent_summary",
      "team_overview",
      "recovery_lite",
      "fuel_lite",
      "learning_lite",
      "wearable_manual_sync",
      "cognitive_lite",
      "cogleague_future",
      "gameflow_future",
      "sports_lab_future"
    ]);
    expect(new Set(ATHLETEIQ_MODULE_REGISTRY.map((module) => module.key)).size).toBe(ATHLETEIQ_MODULE_REGISTRY.length);
  });

  it("validates active modules cannot depend on future-only sources", () => {
    expect(validateAthleteIqModuleRegistry()).toEqual({ ok: true, errors: [] });

    const invalidRegistry = ATHLETEIQ_MODULE_REGISTRY.map((module) =>
      module.key === "readiness"
        ? {
            ...module,
            dataSources: [...module.dataSources, { key: "future_feed", labelKey: "future", availability: "future" as const }]
          }
        : module
    );

    expect(validateAthleteIqModuleRegistry(invalidRegistry).errors).toContain("Active module readiness depends on future source future_feed");
  });

  it("filters modules by role and hides future modules by default", () => {
    const athleteModules = resolveAthleteIqModulesForUser(athleteUser);
    const trainerModules = resolveAthleteIqModulesForUser(trainerUser);

    expect(athleteModules.modules.map((module) => module.key)).toContain("readiness");
    expect(athleteModules.modules.map((module) => module.key)).not.toContain("team_overview");
    expect(trainerModules.modules.map((module) => module.key)).toContain("team_overview");
    expect(trainerModules.modules.some((module) => module.maturity === "future")).toBe(false);
  });

  it("returns an empty permitted set for unsupported roles", () => {
    const result = resolveAthleteIqModulesForUser(athleteUser, { role: "scout" });

    expect(result).toMatchObject({
      registryVersion: ATHLETEIQ_MODULE_REGISTRY_VERSION,
      role: null,
      deniedReason: "UNSUPPORTED_ROLE",
      modules: []
    });
  });
});

describe("AthleteIQ module API", () => {
  it("lists role-filtered modules with registry metadata", async () => {
    const response = await listModules(new Request("http://localhost/api/athleteiq/modules?role=athlete"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.registryVersion).toBe(ATHLETEIQ_MODULE_REGISTRY_VERSION);
    expect(payload.modules.map((module: { key: string }) => module.key)).toContain("readiness");
    expect(payload.modules.map((module: { key: string }) => module.key)).not.toContain("team_overview");
  });

  it("returns structured 404 for unknown module keys", async () => {
    const response = await getModule(new Request("http://localhost/api/athleteiq/modules/not-real"), {
      params: Promise.resolve({ key: "not-real" })
    });
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload).toMatchObject({
      code: "MODULE_NOT_FOUND",
      messageKey: "athleteiq.errors.MODULE_NOT_FOUND",
      retryable: false
    });
    expect(payload.correlationId).toMatch(/^aiq-/);
  });

  it("blocks future modules unless explicitly requested for roadmap use", async () => {
    const blocked = await getModule(new Request("http://localhost/api/athleteiq/modules/cogleague_future?role=trainer"), {
      params: Promise.resolve({ key: "cogleague_future" })
    });
    const allowed = await getModule(new Request("http://localhost/api/athleteiq/modules/cogleague_future?role=trainer&includeFuture=true"), {
      params: Promise.resolve({ key: "cogleague_future" })
    });

    expect(blocked.status).toBe(409);
    expect((await blocked.json()).code).toBe("FUTURE_MODULE_NOT_ACTIONABLE");
    expect(allowed.status).toBe(200);
    expect((await allowed.json()).module.statusLabel).toBe("future_not_actionable");
  });
});
