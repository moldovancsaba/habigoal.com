"use client";

import { Box, getGdsVibeThemeCssVariables } from "@doneisbetter/gds/client";
import { createContext, useContext, useEffect, useMemo, type CSSProperties } from "react";
import { ATHLETE_IQ_GDS_THEME_PRESET } from "@/lib/product-surface-branding";
import {
  getProductSurfaceContract,
  type ProductSurfaceContract,
  type ProductSurfaceKey
} from "@/lib/product-ui-contracts";

const AthleteIqThemeVariables = getGdsVibeThemeCssVariables(ATHLETE_IQ_GDS_THEME_PRESET, "dark") as CSSProperties;

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
  const cssVariables = surface === "athlete_iq" ? AthleteIqThemeVariables : undefined;

  useEffect(() => {
    const root = document.documentElement;
    const previousSurface = root.dataset.activeProductSurface;
    const previousPreset = root.dataset.gdsThemePreset;
    const previousValues = new Map<string, string>();

    root.dataset.activeProductSurface = surface;
    if (surface === "athlete_iq") {
      root.dataset.gdsThemePreset = ATHLETE_IQ_GDS_THEME_PRESET;
      for (const [key, value] of Object.entries(AthleteIqThemeVariables)) {
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
  }, [surface]);

  const content = frame ? (
    <Box
      className={className}
      data-gds-theme-preset={surface === "athlete_iq" ? ATHLETE_IQ_GDS_THEME_PRESET : undefined}
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
