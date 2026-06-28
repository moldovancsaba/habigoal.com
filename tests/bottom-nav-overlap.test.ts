import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Regression guard (#425): the Habigoal consumer content must reserve space for
// the fixed bottom nav (+ safe-area) via a single token, and must NOT inline a
// Mantine `pb` prop that would override that reserve and let the nav cover the
// last card.
const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");
const shell = readFileSync(join(process.cwd(), "components/product/habigoal/HabigoalExperience.tsx"), "utf8");

describe("bottom-nav overlap", () => {
  it("defines a single bottom-nav reserve token including the safe-area inset", () => {
    expect(css).toMatch(/--hbg-bottom-nav-reserve:\s*calc\([^)]*env\(safe-area-inset-bottom\)\)/);
  });

  it("reserves that token as bottom padding on the scroll container", () => {
    expect(css).toMatch(/\.hbg-main-grid\s*\{[\s\S]*padding-bottom:\s*var\(--hbg-bottom-nav-reserve\)/);
  });

  it("does not inline a Mantine pb override on the main scroll container", () => {
    // The hbg-main-grid Box must not carry a `pb=` prop (it would out-specify
    // the CSS reserve via inline styles).
    const mainTag = shell.match(/<Box[^>]*className="hbg-main-grid"[^>]*>/);
    expect(mainTag, "expected the hbg-main-grid Box").not.toBeNull();
    expect(mainTag?.[0]).not.toMatch(/\spb=/);
  });
});
