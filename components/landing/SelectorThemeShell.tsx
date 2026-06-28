"use client";

import { getGdsVibeThemeCssVariables } from "@doneisbetter/gds/client";
import type { CSSProperties, ReactNode } from "react";
import { SELECTOR_GDS_THEME_PRESET } from "@/lib/product-surface-branding";

// Applies a neutral GDS vibe theme to the app-selector shell so the selector is
// visually distinct from both products. Server-rendered content is passed as
// children; only the theme wrapper is a client boundary.
const SELECTOR_THEME_VARIABLES = getGdsVibeThemeCssVariables(SELECTOR_GDS_THEME_PRESET, "light") as CSSProperties;

export function SelectorThemeShell({ children }: { children: ReactNode }) {
  return (
    <div className="landing-selector-vibe" data-gds-theme-preset={SELECTOR_GDS_THEME_PRESET} style={SELECTOR_THEME_VARIABLES}>
      {children}
    </div>
  );
}
