"use client";

import { Box, getGdsVibeThemeCssVariables } from "@sovereignsquad/gds/client";
import { createContext, useContext, useEffect, useMemo, type CSSProperties } from "react";
import { ATHLETE_IQ_GDS_THEME_PRESET } from "@/lib/product-surface-branding";
import {
  getProductSurfaceContract,
  type ProductSurfaceContract,
  type ProductSurfaceKey
} from "@/lib/product-ui-contracts";

const GoldAthleteThemeVariables = getGdsVibeThemeCssVariables(ATHLETE_IQ_GDS_THEME_PRESET, "dark") as Record<string, string>;
const GoldAthleteAppVariables: Record<string, string> = {
  "--app-bg": "var(--gds-vibe-gradient)",
  "--blob-1": "color-mix(in srgb, var(--gds-vibe-accent) 12%, transparent)",
  "--blob-2": "color-mix(in srgb, var(--gds-vibe-primary) 10%, transparent)",
  "--blob-3": "color-mix(in srgb, var(--gds-vibe-surface) 18%, transparent)",
  "--border-primary": "var(--gds-vibe-border)",
  "--grid-line": "color-mix(in srgb, var(--gds-vibe-accent) 14%, transparent)",
  "--nav-company-description": "var(--gds-vibe-muted)",
  "--nav-company-label": "var(--gds-vibe-text)",
  "--nav-link-active": "var(--gds-vibe-text)",
  "--nav-link-inactive": "var(--gds-vibe-muted)",
  "--surface-base": "var(--gds-vibe-surface)",
  "--surface-elevated": "var(--gds-vibe-shell)",
  "--surface-gradient-bottom": "transparent",
  "--surface-gradient-top": "color-mix(in srgb, var(--gds-vibe-accent) 6%, transparent)",
  "--surface-hover-bottom": "transparent",
  "--surface-hover-top": "color-mix(in srgb, var(--gds-vibe-accent) 10%, transparent)",
  "--surface-icon-border": "var(--gds-vibe-border)",
  "--surface-section-border": "var(--gds-vibe-border)",
  "--surface-shadow-elevated": "0 24px 64px color-mix(in srgb, var(--gds-vibe-surface) 52%, transparent), inset 0 1px 0 color-mix(in srgb, var(--gds-vibe-accent) 6%, transparent)",
  "--text-primary": "var(--gds-vibe-text)",
  "--text-secondary": "var(--gds-vibe-muted)",
  "--text-muted": "color-mix(in srgb, var(--gds-vibe-muted) 68%, transparent)"
};
const GoldAthleteRootVariables = { ...GoldAthleteThemeVariables, ...GoldAthleteAppVariables };

const ProductSurfaceContext = createContext<ProductSurfaceContract>(getProductSurfaceContract("public"));

export function useProductSurfaceContract() {
  return useContext(ProductSurfaceContext);
}

export function ProductThemeBoundary({
  children,
  className,
  frame = true,
  surface
}: {
  children: React.ReactNode;
  className?: string;
  frame?: boolean;
  surface: ProductSurfaceKey;
}) {
  const contract = useMemo(() => getProductSurfaceContract(surface), [surface]);
  const usesGoldAthleteTheme = surface === "athlete_iq" || surface === "habigoal" || surface === "dashboard";
  const cssVariables = usesGoldAthleteTheme ? GoldAthleteRootVariables as CSSProperties : undefined;

  useEffect(() => {
    const root = document.documentElement;
    const previousSurface = root.dataset.activeProductSurface;
    const previousPreset = root.dataset.gdsThemePreset;
    const previousValues = new Map<string, string>();

    root.dataset.activeProductSurface = surface;
    if (usesGoldAthleteTheme) {
      root.dataset.gdsThemePreset = ATHLETE_IQ_GDS_THEME_PRESET;
      for (const [key, value] of Object.entries(GoldAthleteRootVariables)) {
        previousValues.set(key, root.style.getPropertyValue(key));
        root.style.setProperty(key, String(value));
      }
    } else {
      delete root.dataset.gdsThemePreset;
    }

    return () => {
      if (previousSurface) root.dataset.activeProductSurface = previousSurface;
      else delete root.dataset.activeProductSurface;

      if (previousPreset) root.dataset.gdsThemePreset = previousPreset;
      else delete root.dataset.gdsThemePreset;

      for (const [key, previous] of previousValues) {
        if (previous) root.style.setProperty(key, previous);
        else root.style.removeProperty(key);
      }
    };
  }, [surface, usesGoldAthleteTheme]);

  const content = frame ? (
    <Box
      className={className}
      data-gds-theme-preset={usesGoldAthleteTheme ? ATHLETE_IQ_GDS_THEME_PRESET : undefined}
      data-product-surface={surface}
      style={cssVariables}
    >
      {children}
    </Box>
  ) : (
    <>{children}</>
  );

  return (
    <ProductSurfaceContext.Provider value={contract}>
      {content}
    </ProductSurfaceContext.Provider>
  );
}
