import { describe, expect, it } from "vitest";
import { ATHLETE_IQ_GDS_THEME_PRESET } from "./product-surface-branding";
import {
  getLocalizedProductAppPath,
  getProductAppContract,
  getProductAppSessionInput,
  PRODUCT_APP_SEQUENCE,
  resolveAthleteIqProductAppId
} from "./product-apps";
import { getSurfaceFunctionIds } from "./product-surfaces";

describe("canonical product app contracts", () => {
  it("defines exactly the three independently executable app experiences", () => {
    expect(PRODUCT_APP_SEQUENCE).toEqual(["habigoal", "athlete-iq-athlete", "athlete-iq-trainer"]);

    const contracts = PRODUCT_APP_SEQUENCE.map((id) => getProductAppContract(id));
    expect(contracts.map((contract) => contract.id)).toEqual(PRODUCT_APP_SEQUENCE);
    expect(new Set(contracts.map((contract) => contract.label)).size).toBe(3);
  });

  it("keeps every app on the official Athlete Gold design-system preset", () => {
    for (const appId of PRODUCT_APP_SEQUENCE) {
      const contract = getProductAppContract(appId);

      expect(contract.themePresetId).toBe(ATHLETE_IQ_GDS_THEME_PRESET);
      expect(contract.themePresetId).toBe("athlete-gold");
    }
  });

  it("keeps Habigoal independent and usable by all supported roles", () => {
    const contract = getProductAppContract("habigoal");

    expect(contract.routePath).toBe("/habigoal");
    expect(contract.productSurfaceId).toBe("habigoal");
    expect(contract.productSurfaceKey).toBe("habigoal");
    expect(contract.defaultPersona).toBe("athlete");
    expect(contract.allowedRoles).toEqual(["admin", "athlete", "trainer", "parent", "performance_coach", "physio", "analyst", "club_management"]);
    expect(contract.sharedDataPolicy.dailyStatus).toBe("write-personal");
    expect(contract.sharedDataPolicy.mayRenderForeignProductUi).toBe(false);
    expect(contract.sharedDataPolicy.mayPublishForeignProductFunctions).toBe(false);
  });

  it("separates Athlete IQ athlete and trainer execution contracts", () => {
    const athlete = getProductAppContract("athlete-iq-athlete");
    const trainer = getProductAppContract("athlete-iq-trainer");

    expect(athlete.routePath).toBe("/athlete-iq");
    expect(trainer.routePath).toBe("/athlete-iq");
    expect(athlete.defaultPersona).toBe("athlete");
    expect(trainer.defaultPersona).toBe("trainer");
    expect(athlete.allowedRoles).toContain("athlete");
    expect(trainer.allowedRoles).not.toContain("athlete");
    expect(trainer.allowedRoles).not.toContain("parent");
    expect(athlete.sharedDataPolicy.dailyStatus).toBe("read-write-own-athlete");
    expect(trainer.sharedDataPolicy.dailyStatus).toBe("read-team");
  });

  it("blocks cross-app shell and function ownership at the contract level", () => {
    const habigoal = getProductAppContract("habigoal");
    const athlete = getProductAppContract("athlete-iq-athlete");
    const trainer = getProductAppContract("athlete-iq-trainer");

    expect(habigoal.ownedShellMarkers).toEqual(expect.arrayContaining(["habigoal-product-shell", "hbg-app-frame", "hbg-bottom-nav"]));
    expect(habigoal.forbiddenShellMarkers).toEqual(expect.arrayContaining(["aiq-product-shell", "aiq-command-layout", "DashboardShell"]));
    expect(athlete.ownedShellMarkers).toEqual(expect.arrayContaining(["aiq-product-shell", "aiq-command-layout", "aiq-sidebar-v2"]));
    expect(trainer.ownedShellMarkers).toEqual(expect.arrayContaining(["aiq-product-shell", "aiq-command-layout", "aiq-sidebar-v2"]));
    expect(athlete.forbiddenShellMarkers).toEqual(expect.arrayContaining(["habigoal-product-shell", "hbg-app-frame", "DashboardShell"]));
    expect(trainer.forbiddenShellMarkers).toEqual(expect.arrayContaining(["habigoal-product-shell", "hbg-app-frame", "DashboardShell"]));
    expect(habigoal.allowedFunctionPrefixes).toEqual(["hbg-"]);
    expect(athlete.allowedFunctionPrefixes).toEqual(["aiq-"]);
    expect(trainer.allowedFunctionPrefixes).toEqual(["aiq-"]);
  });

  it("matches the published function registries for each app surface", () => {
    const habigoalFunctionIds = getSurfaceFunctionIds("habigoal");
    const athleteIqFunctionIds = getSurfaceFunctionIds("athlete-iq");

    expect(habigoalFunctionIds.every((id) => id.startsWith(getProductAppContract("habigoal").allowedFunctionPrefixes[0]))).toBe(true);
    expect(athleteIqFunctionIds.every((id) => id.startsWith(getProductAppContract("athlete-iq-athlete").allowedFunctionPrefixes[0]))).toBe(true);
    expect(athleteIqFunctionIds.every((id) => id.startsWith(getProductAppContract("athlete-iq-trainer").allowedFunctionPrefixes[0]))).toBe(true);
  });

  it("builds session inputs from the app contract instead of route-local strings", () => {
    const habigoal = getProductAppContract("habigoal");
    const athlete = getProductAppContract("athlete-iq-athlete");
    const trainer = getProductAppContract("athlete-iq-trainer");

    expect(getLocalizedProductAppPath(habigoal, "hu")).toBe("/hu/habigoal");
    expect(getLocalizedProductAppPath(athlete, "hu", { persona: "athlete" })).toBe("/hu/athlete-iq?persona=athlete");
    expect(getLocalizedProductAppPath(trainer, "hu", { persona: "trainer" })).toBe("/hu/athlete-iq?persona=trainer");
    expect(getProductAppSessionInput(habigoal, "hu")).toMatchObject({ path: "/hu/habigoal", persona: "athlete", surface: "habigoal" });
    expect(getProductAppSessionInput(athlete, "hu", { persona: "athlete" })).toMatchObject({ path: "/hu/athlete-iq?persona=athlete", persona: "athlete", surface: "athlete-iq" });
    expect(getProductAppSessionInput(trainer, "hu")).toMatchObject({ path: "/hu/athlete-iq?persona=trainer", persona: "trainer", surface: "athlete-iq" });
  });

  it("resolves the Athlete IQ route to the correct app contract from persona", () => {
    expect(resolveAthleteIqProductAppId("athlete")).toBe("athlete-iq-athlete");
    expect(resolveAthleteIqProductAppId("trainer")).toBe("athlete-iq-trainer");
    expect(resolveAthleteIqProductAppId(undefined)).toBe("athlete-iq-trainer");
    expect(resolveAthleteIqProductAppId("unknown")).toBe("athlete-iq-trainer");
  });

  it("documents runtime, accessibility, observability, retry, and rollback behavior for every app", () => {
    for (const appId of PRODUCT_APP_SEQUENCE) {
      const contract = getProductAppContract(appId);

      expect(contract.runtimeFlow.length).toBeGreaterThanOrEqual(5);
      expect(contract.accessibility.length).toBeGreaterThanOrEqual(3);
      expect(contract.observabilityEvents.length).toBeGreaterThanOrEqual(4);
      expect(contract.retryPolicy).toContain("fail");
      expect(contract.rollbackPolicy).toBeTruthy();
    }
  });
});
