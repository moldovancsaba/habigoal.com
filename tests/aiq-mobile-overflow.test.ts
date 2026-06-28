import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Regression guard: the AIQ check-in surface clipped its cards/sliders off the
// right edge on phones because the collapsed grid tracks used a bare `1fr`
// (implicit `auto` minimum → column can't shrink → overflow hidden by the
// shell's `overflow-x: clip`). The collapsed tracks must use `minmax(0, 1fr)`
// and their children must be allowed to shrink.
const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");

function mobileBlock(): string {
  const match = css.match(/@media\s*\(max-width:\s*62em\)\s*\{[\s\S]*?\n\}/);
  expect(match, "expected a @media (max-width: 62em) block").not.toBeNull();
  return match?.[0] ?? "";
}

describe("AIQ mobile overflow", () => {
  it("collapses the command layout to a shrinkable single column (minmax(0, 1fr))", () => {
    const block = mobileBlock();
    expect(block).toMatch(/\.aiq-command-layout\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)/);
  });

  it("collapses the legacy layout grid to a shrinkable single column", () => {
    const block = mobileBlock();
    expect(block).toMatch(/\.aiq-layout-grid\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)/);
  });

  it("never re-introduces a bare `1fr` collapsed track that cannot shrink", () => {
    const block = mobileBlock();
    expect(block).not.toMatch(/grid-template-columns:\s*1fr\s*;/);
  });

  it("lets the collapsed grid children shrink below their content width", () => {
    const block = mobileBlock();
    expect(block).toMatch(/\.aiq-command-layout\s*>\s*\*[\s\S]*?min-width:\s*0/);
  });
});
