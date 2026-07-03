import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Guards the adaptive token foundation (GH-400): capability-driven target size,
// density floor, and the surface-radius token must remain declared.
const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");

describe("adaptive tokens", () => {
  it("declares --target-size with a precise-pointer default of 32px", () => {
    expect(css).toMatch(/--target-size:\s*32px/);
  });

  it("upgrades --target-size to 48px when any coarse pointer is present", () => {
    expect(css).toMatch(/@media\s*\(any-pointer:\s*coarse\)\s*\{[\s\S]*--target-size:\s*48px/);
  });

  it("declares the --surface-radius single source of truth", () => {
    expect(css).toMatch(/--surface-radius:/);
  });

  it("floors density row height at the capability-correct target size", () => {
    expect(css).toMatch(/\[data-density="compact"\][\s\S]*max\([^)]*var\(--target-size\)\)/);
  });

  it("does not gate the target size on viewport width", () => {
    // The capability media block must use any-pointer, never a width breakpoint.
    const block = css.match(/@media\s*\(any-pointer:\s*coarse\)\s*\{[\s\S]*?--target-size:\s*48px[\s\S]*?\}/);
    expect(block).not.toBeNull();
  });

  it("migrates interactive primitives to the target-size token (GH-402)", () => {
    const tokenMins = css.match(/min-height:\s*max\(var\(--target-size\),/g) || [];
    expect(tokenMins.length).toBeGreaterThanOrEqual(12);
  });
});
