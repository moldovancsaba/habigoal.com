import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Guards the selector device-class responsive shell (#403): the selector is the
// reference implementation of the two-axis adaptive model — WIDTH drives the
// column count, input CAPABILITY drives affordances — so these declarations must
// remain in place.
const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");
const page = readFileSync(join(process.cwd(), "app/[locale]/page.tsx"), "utf8");
const card = readFileSync(join(process.cwd(), "components/landing/ProductEntryCard.tsx"), "utf8");

describe("selector responsive shell", () => {
  it("drives column count by viewport width (single column → two-up at the sm breakpoint)", () => {
    expect(page).toMatch(/cols=\{\{\s*base:\s*1,\s*sm:\s*2\s*\}\}/);
  });

  it("gates the hover lift on a fine, hovering pointer (capability channel, not width)", () => {
    expect(css).toMatch(/@media\s*\(hover:\s*hover\)\s*and\s*\(pointer:\s*fine\)\s*\{[\s\S]*\.selector-card:hover/);
  });

  it("never gates the hover affordance on a width breakpoint", () => {
    const block = css.match(/@media\s*\(hover:\s*hover\)\s*and\s*\(pointer:\s*fine\)\s*\{[\s\S]*?\.selector-card:hover[\s\S]*?\}\s*\}/);
    expect(block).not.toBeNull();
    expect(block?.[0]).not.toMatch(/width/);
  });

  it("renders the card as a real, keyboard-operable link with an accessible name", () => {
    expect(card).toMatch(/className="selector-card-link"/);
    expect(card).toMatch(/aria-label=\{ariaLabel\}/);
  });

  it("provides a visible :focus-visible indicator for the card link", () => {
    expect(css).toMatch(/\.selector-card-link:focus-visible\s*\{[\s\S]*outline:/);
  });

  it("floors the primary card action at the capability-driven target size", () => {
    expect(css).toMatch(/\.selector-card-action\s*\{[\s\S]*min-height:\s*var\(--target-size\)/);
  });

  it("honours prefers-reduced-motion by disabling the hover lift", () => {
    expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*\.selector-card:hover\s*\{[\s\S]*transform:\s*none/);
  });
});
