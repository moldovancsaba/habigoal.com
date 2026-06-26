import { describe, expect, it } from "vitest";
import { getSurfaceFunctionIds, productSurfaces } from "./product-surfaces";

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
});
