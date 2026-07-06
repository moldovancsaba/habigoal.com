"use client";

import { getGdsVibeThemeCssVariables } from "@sovereignsquad/gds/client";
import type { CSSProperties, ReactNode } from "react";
import { SELECTOR_GDS_THEME_PRESET } from "@/lib/product-surface-branding";

// Applies the same Athlete Gold GDS preset as the product apps. Server-rendered
// content is passed as children; only the theme wrapper is a client boundary.
const SELECTOR_THEME_VARIABLES = getGdsVibeThemeCssVariables(SELECTOR_GDS_THEME_PRESET, "dark") as CSSProperties;

export function SelectorThemeShell({ children }: { children: ReactNode }) {
  return (
    <div className="landing-selector-vibe" data-gds-theme-preset={SELECTOR_GDS_THEME_PRESET} style={SELECTOR_THEME_VARIABLES}>
      {children}
    </div>
  );
}
