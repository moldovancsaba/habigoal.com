import { describe, expect, it } from "vitest";
import {
  getProductColor,
  getRouteChromeContract,
  normalizeAppPath,
  resolveProductSurfaceFromPathname,
  scoreToProgressIntent,
  signalStateToIntent
} from "./product-ui-contracts";

describe("product UI contracts", () => {
  it("normalizes locale-prefixed app paths before resolving surfaces", () => {
    expect(normalizeAppPath("/en/habigoal")).toBe("/habigoal");
    expect(resolveProductSurfaceFromPathname("/hu/athlete-iq")).toBe("athlete_iq");
    expect(resolveProductSurfaceFromPathname("/de/dashboard/coach")).toBe("dashboard");
  });

  it("declares dashboard shell ownership for embedded product routes", () => {
    expect(getRouteChromeContract("/en/habigoal").shellOwner).toBe("dashboard");
    expect(getRouteChromeContract("/en/athlete-iq").activeSurface).toBe("athlete_iq");
    expect(getRouteChromeContract("/en/dashboard").allowProductTopBar).toBe(false);
  });

  it("maps visible product states to GDS semantic color tokens", () => {
    expect(getProductColor("athlete_iq", "primaryAction")).toBe("review");
    expect(getProductColor("athlete_iq", "warning")).toBe("review");
    expect(getProductColor("habigoal", "primaryAction")).toBe("knowmore");
    expect(signalStateToIntent("missing")).toBe("neutral");
    expect(scoreToProgressIntent(55)).toBe("progressWatch");
  });
});
