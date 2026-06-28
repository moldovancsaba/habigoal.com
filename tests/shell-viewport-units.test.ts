import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// #428: touch shells must use the progressive dynamic-viewport pattern
// (vh fallback → svh → dvh) so the mobile address bar collapsing doesn't leave a
// short or jumpy shell. Guards the two shells the audit found on bare `100vh`.
const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");

function shellBlock(selector: string): string {
  const m = css.match(new RegExp(`\\${selector}\\s*\\{[\\s\\S]*?\\}`));
  expect(m, `expected a ${selector} rule`).not.toBeNull();
  return m?.[0] ?? "";
}

describe("shell viewport units (#428)", () => {
  for (const selector of [".habigoal-home-shell", ".aiq-pro-shell"]) {
    it(`${selector} uses the vh → svh → dvh progressive pattern`, () => {
      const block = shellBlock(selector);
      expect(block).toMatch(/min-height:\s*100vh/);
      expect(block).toMatch(/min-height:\s*100svh/);
      expect(block).toMatch(/min-height:\s*100dvh/);
    });
  }
});
