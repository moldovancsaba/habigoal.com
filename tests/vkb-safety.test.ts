import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Virtual-keyboard safety guards (#412).
const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");
const viewport = readFileSync(join(process.cwd(), "app/[locale]/layout.tsx"), "utf8");
const login = readFileSync(join(process.cwd(), "app/[locale]/login/page.tsx"), "utf8");

describe("virtual-keyboard safety", () => {
  it("never locks pinch-zoom (WCAG 1.4.4): no maximum-scale / user-scalable", () => {
    expect(viewport).not.toMatch(/maximumScale/);
    expect(viewport).not.toMatch(/userScalable/);
  });

  // Anchor on the input-zoom block specifically (there is also a separate
  // any-pointer: coarse block for --target-size): take the coarse @media that
  // immediately precedes the `.mantine-Input-input` selector.
  const mantineIdx = css.indexOf(".mantine-Input-input,");
  const openIdx = css.lastIndexOf("@media (any-pointer: coarse)", mantineIdx);
  const closeIdx = css.indexOf("}\n}", mantineIdx);
  const inputZoomBlock = mantineIdx >= 0 && openIdx >= 0 ? css.slice(openIdx, closeIdx + 3) : "";

  it("guarantees ≥16px inputs on coarse pointers to prevent iOS focus-zoom", () => {
    expect(inputZoomBlock, "expected a coarse-pointer input-zoom rule").not.toBe("");
    expect(inputZoomBlock).toMatch(/font-size:\s*16px/);
    // Must cover the Mantine class, which otherwise out-specifies a bare `input`.
    expect(inputZoomBlock).toMatch(/\.mantine-Input-input/);
  });

  it("gates the zoom-prevention on input capability, not viewport width", () => {
    expect(inputZoomBlock).not.toMatch(/width/);
  });

  it("sets the correct keyboard semantics on the login email field", () => {
    expect(login).toMatch(/inputMode="email"/);
    expect(login).toMatch(/enterKeyHint="go"/);
  });

  it("mounts the focus-keeping helper inside the login form", () => {
    expect(login).toMatch(/<KeepFocusedFieldVisible \/>/);
  });
});
