import { describe, expect, it } from "vitest";
import { getSurfaceFunctionIds, getSurfaceFunctions, getSurfaceNavigation, productSurfaces } from "./product-surfaces";

describe("product surface function registries", () => {
  it("keeps Habigoal and Athlete IQ as separate publishable surfaces", () => {
    expect(productSurfaces.map((surface) => surface.id)).toEqual(["habigoal", "athlete-iq"]);

    const habigoal = productSurfaces.find((surface) => surface.id === "habigoal");
    const athleteIq = productSurfaces.find((surface) => surface.id === "athlete-iq");

    expect(habigoal?.includedSurfaceIds).toEqual([]);
    expect(athleteIq?.includedSurfaceIds).toEqual(["habigoal"]);
  });

  it("includes every Habigoal function inside Athlete IQ through the shared registry contract", () => {
    const habigoalFunctionIds = getSurfaceFunctionIds("habigoal");
    const athleteIqFunctionIds = getSurfaceFunctionIds("athlete-iq");

    for (const functionId of habigoalFunctionIds) {
      expect(athleteIqFunctionIds).toContain(functionId);
    }
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
  });

  it("exposes separate navigation and themes for the two products", () => {
    const habigoal = productSurfaces.find((surface) => surface.id === "habigoal");
    const athleteIq = productSurfaces.find((surface) => surface.id === "athlete-iq");

    expect(habigoal?.theme.mode).toBe("supportive-light");
    expect(athleteIq?.theme.mode).toBe("professional-dark");
    expect(getSurfaceNavigation("habigoal").map((item) => item.label)).not.toEqual(
      getSurfaceNavigation("athlete-iq").map((item) => item.label)
    );
  });

  it("shares the same foundation contracts across both surfaces", () => {
    const habigoal = productSurfaces.find((surface) => surface.id === "habigoal");
    const athleteIq = productSurfaces.find((surface) => surface.id === "athlete-iq");

    expect(habigoal?.sharedDataContracts.map((contract) => contract.id)).toEqual(
      athleteIq?.sharedDataContracts.map((contract) => contract.id)
    );
  });
});
