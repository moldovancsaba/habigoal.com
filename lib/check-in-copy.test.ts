import { describe, expect, it } from "vitest";
import { resolveCheckInPromptKey, checkInPromptDef } from "./check-in-copy";
import { selectCopyKey } from "./copy-variants";

describe("check-in prompt variants (#intelligent-copy)", () => {
  it("resolves to one of the signal's three variants", () => {
    const key = resolveCheckInPromptKey("sleepQualityPrompt", { now: Date.parse("2026-06-29T09:00:00"), seed: "a1" });
    expect(["sleepQualityPrompt", "sleepQualityPromptB", "sleepQualityPromptC"]).toContain(key);
  });

  it("keeps each signal in its own keyspace (no shared line)", () => {
    const ctx = { now: Date.parse("2026-06-29T09:00:00"), seed: "a1" };
    expect(selectCopyKey(checkInPromptDef("moodPrompt"), ctx).startsWith("moodPrompt")).toBe(true);
    expect(selectCopyKey(checkInPromptDef("focusPrompt"), ctx).startsWith("focusPrompt")).toBe(true);
  });

  it("rotates a signal's prompt across days", () => {
    const keys = new Set(
      Array.from({ length: 14 }, (_, d) =>
        resolveCheckInPromptKey("energyPrompt", {
          now: Date.parse(`2026-07-${String(1 + d).padStart(2, "0")}T09:00:00`),
          seed: "a1",
        })
      )
    );
    expect(keys.size).toBeGreaterThan(1);
  });
});
