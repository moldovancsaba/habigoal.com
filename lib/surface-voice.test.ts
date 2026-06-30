import { describe, expect, it } from "vitest";
import { heroSubtitleDef, reflectionPromptDef } from "./surface-voice";
import { selectCopyKey } from "./copy-variants";

const MORNING = Date.parse("2026-06-29T08:00:00");
const AFTERNOON = Date.parse("2026-06-29T14:00:00");
const EVENING = Date.parse("2026-06-29T20:00:00");

describe("surface hero voice (#intelligent-copy)", () => {
  it("uses a time-of-day greeting variant when one matches", () => {
    const def = heroSubtitleDef("hero.subtitle");
    expect(selectCopyKey(def, { now: MORNING })).toBe("hero.subtitleVariants.morning");
    expect(selectCopyKey(def, { now: AFTERNOON })).toBe("hero.subtitleVariants.afternoon");
    expect(selectCopyKey(def, { now: EVENING })).toBe("hero.subtitleVariants.evening");
  });

  it("keeps the original key in the neutral rotation pool", () => {
    const def = heroSubtitleDef("athleteWorkspace.hero.subtitle");
    const keys = new Set(
      Array.from({ length: 21 }, (_, d) =>
        // vary the day but keep a neutral time (afternoon excluded by using 02:00 night? use a fixed neutral by removing gating)
        selectCopyKey({ id: def.id, variants: def.variants.filter((v) => !v.when) }, {
          now: Date.parse(`2026-07-${String(1 + d).padStart(2, "0")}T10:00:00`),
        })
      )
    );
    expect(keys.has("athleteWorkspace.hero.subtitle")).toBe(true);
    expect(keys.size).toBeGreaterThan(1);
  });

  it("gives the reflection prompt a time-of-day variant in its own keyspace", () => {
    const def = reflectionPromptDef("reflection.bodyPlaceholder");
    expect(selectCopyKey(def, { now: MORNING })).toBe("reflection.bodyPlaceholderVariants.morning");
    expect(selectCopyKey(def, { now: EVENING })).toBe("reflection.bodyPlaceholderVariants.evening");
  });
});
