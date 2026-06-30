import { describe, expect, it } from "vitest";
import {
  SESSION_BLUEPRINTS,
  getActiveBlueprints,
  getBlueprintByKey,
  blueprintDurationSeconds,
} from "./session-blueprints";

describe("session blueprints (#83 TRN-002)", () => {
  it("exposes active blueprints with non-empty ordered drills", () => {
    const active = getActiveBlueprints();
    expect(active.length).toBeGreaterThan(0);
    for (const b of active) {
      expect(b.drills.length).toBeGreaterThan(0);
      for (const d of b.drills) expect(d.seconds).toBeGreaterThan(0);
    }
  });

  it("looks up a blueprint by key and returns null for unknown keys", () => {
    expect(getBlueprintByKey("standard-technical")?.variant).toBe("standard");
    expect(getBlueprintByKey("does-not-exist")).toBeNull();
  });

  it("sums total planned duration", () => {
    const b = getBlueprintByKey("recovery-flow")!;
    expect(blueprintDurationSeconds(b)).toBe(b.drills.reduce((s, d) => s + d.seconds, 0));
  });

  it("uses unique blueprint keys", () => {
    const keys = SESSION_BLUEPRINTS.map((b) => b.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
