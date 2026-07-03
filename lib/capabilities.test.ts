import { describe, expect, it } from "vitest";
import { resolveCapabilities, type Capabilities } from "@/lib/capabilities";

const ALL_OFF: Capabilities = {
  visionAi: false,
  gpsIngestion: false,
  forecasting: false,
  aiCoachNudges: false,
  cogLeague: false,
  gameFlow: false,
};

describe("resolveCapabilities (GH-440)", () => {
  it("defaults every capability to off so nothing fabricated is shown by default", () => {
    expect(resolveCapabilities(ALL_OFF)).toEqual(ALL_OFF);
  });

  it("reflects enabled flags", () => {
    const cap = resolveCapabilities({ ...ALL_OFF, visionAi: true, gpsIngestion: true });
    expect(cap.visionAi).toBe(true);
    expect(cap.gpsIngestion).toBe(true);
    expect(cap.forecasting).toBe(false);
  });

  it("coerces truthy/falsy inputs to booleans", () => {
    const cap = resolveCapabilities({ ...ALL_OFF, forecasting: 1 as unknown as boolean });
    expect(cap.forecasting).toBe(true);
  });

  it("exposes exactly the known capability keys", () => {
    expect(Object.keys(resolveCapabilities(ALL_OFF)).sort()).toEqual(
      ["aiCoachNudges", "cogLeague", "forecasting", "gameFlow", "gpsIngestion", "visionAi"]
    );
  });
});
