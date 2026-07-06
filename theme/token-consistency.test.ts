import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Guard for #430: keep token-bypassing literals from creeping back into the
// shared stylesheet / theme. These assert the SPECIFIC drifts the audit found,
// not every literal — token DEFINITION layers (`:root` and the light-theme
// override block, where brand values are mapped onto semantic tokens) are the
// legitimate home for raw values and are intentionally not policed here.
const globals = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
const mantineTheme = readFileSync(new URL("./mantine-theme.ts", import.meta.url), "utf8");
const legacyHex = (prefix: string, suffix: string) => `#${prefix}${suffix}`;

describe("design-system token consistency (#430)", () => {
  it("uses one radius source of truth — no drifted 14px/10px border-radius literals", () => {
    expect(globals).not.toContain("border-radius: 14px");
    expect(globals).not.toContain("border-radius: 10px");
    // The NavLink theme override must use the shared radius token, not a literal.
    expect(mantineTheme).not.toMatch(/borderRadius:\s*10\b/);
    expect(mantineTheme).toContain('borderRadius: "var(--surface-radius)"');
  });

  it("references brand colours through tokens, not hex literals, on component selectors", () => {
    // The off-token AIQ gold is gone entirely; legacy accent hues no longer appear
    // as raw *-color declarations on the selector score ring.
    expect(globals).not.toContain("#f5c542");
    expect(globals).not.toContain(`border-top-color: ${legacyHex("00", "b894")}`);
    expect(globals).not.toContain(`border-right-color: ${legacyHex("00", "aeef")}`);
    // No accent-color is set from a raw hex anywhere.
    expect(globals).not.toMatch(/accent-color:\s*#/);
  });
});
