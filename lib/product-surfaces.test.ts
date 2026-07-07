import { describe, expect, it } from "vitest";
import { resolveGdsVibeTheme } from "@sovereignsquad/gds";
import { ATHLETE_IQ_GDS_THEME_PRESET } from "./product-surface-branding";
import { getSurfaceFunctionIds, getSurfaceFunctions, getSurfaceNavigation, productSurfaces } from "./product-surfaces";

describe("product surface function registries", () => {
  it("keeps Habigoal and Athlete IQ as separate publishable surfaces", () => {
    expect(productSurfaces.map((surface) => surface.id)).toEqual(["habigoal", "athlete-iq"]);

    for (const surface of productSurfaces) {
      expect("includedSurfaceIds" in surface).toBe(false);
    }
  });

  it("does not publish Habigoal functions inside the Athlete IQ registry", () => {
    const habigoalFunctionIds = getSurfaceFunctionIds("habigoal");
    const athleteIqFunctionIds = getSurfaceFunctionIds("athlete-iq");

    for (const functionId of habigoalFunctionIds) {
      expect(athleteIqFunctionIds).not.toContain(functionId);
    }
  });

  it("treats Athlete IQ access to shared daily-status records as data capability, not UI nesting", () => {
    const habigoal = productSurfaces.find((surface) => surface.id === "habigoal");
    const athleteIq = productSurfaces.find((surface) => surface.id === "athlete-iq");
    const dailyStatusContract = athleteIq?.sharedDataContracts.find((contract) => contract.id === "daily-status");

    expect(athleteIq?.primaryPath).toBe("/athlete-iq");
    expect(habigoal?.primaryPath).toBe("/habigoal");
    expect(athleteIq?.summary).toContain("shared daily-status records");
    expect(dailyStatusContract?.syncBehavior).toContain("never imports Habigoal UI or Habigoal functions");
    expect(JSON.stringify(athleteIq)).not.toMatch(/copy|embed|presentation|includedSurfaceIds/i);
  });

  it("does not duplicate function IDs inside a surface", () => {
    for (const surface of productSurfaces) {
      const functionIds = surface.functionRegistry.map((item) => item.id);
      expect(new Set(functionIds).size).toBe(functionIds.length);
    }
  });

  it("keeps Habigoal client-safe while Athlete IQ owns professional-only functions", () => {
    const habigoalFunctions = getSurfaceFunctions("habigoal");
    const athleteIqFunctions = getSurfaceFunctions("athlete-iq");

    expect(habigoalFunctions.every((item) => item.id.startsWith("hbg-"))).toBe(true);
    expect(athleteIqFunctions.some((item) => item.id.startsWith("aiq-"))).toBe(true);
    expect(athleteIqFunctions.every((item) => !item.id.startsWith("hbg-"))).toBe(true);
  });

  it("exposes separate navigation under the same official Athlete Gold theme", () => {
    const habigoal = productSurfaces.find((surface) => surface.id === "habigoal");
    const athleteIq = productSurfaces.find((surface) => surface.id === "athlete-iq");

    expect(habigoal?.theme.mode).toBe("athlete-gold");
    expect(habigoal?.theme.gdsPresetId).toBe(ATHLETE_IQ_GDS_THEME_PRESET);
    expect(athleteIq?.theme.mode).toBe("athlete-gold");
    expect(athleteIq?.theme.gdsPresetId).toBe(ATHLETE_IQ_GDS_THEME_PRESET);
    expect(getSurfaceNavigation("habigoal").every((item) => item.path === "/habigoal")).toBe(true);
    expect(getSurfaceNavigation("habigoal").map((item) => item.label)).not.toEqual(
      getSurfaceNavigation("athlete-iq").map((item) => item.label)
    );
  });

  it("uses the GDS Athlete Gold preset for Athlete IQ", () => {
    const athleteGold = resolveGdsVibeTheme(ATHLETE_IQ_GDS_THEME_PRESET);

    expect(athleteGold.id).toBe(ATHLETE_IQ_GDS_THEME_PRESET);
    expect(athleteGold.label).toBe("Athlete Gold");
    expect(athleteGold.gradient).toContain("linear-gradient");
  });

  it("shares the same foundation contracts across both surfaces", () => {
    const habigoal = productSurfaces.find((surface) => surface.id === "habigoal");
    const athleteIq = productSurfaces.find((surface) => surface.id === "athlete-iq");

    expect(habigoal?.sharedDataContracts.map((contract) => contract.id)).toEqual(
      athleteIq?.sharedDataContracts.map((contract) => contract.id)
    );
  });
});
