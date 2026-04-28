"use client";

import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";
import CssBaseline from "@mui/material/CssBaseline";
import type { Direction } from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import { CacheProvider } from "@emotion/react";
import createCache from "@emotion/cache";
import { useMemo } from "react";
import rtlPlugin from "@mui/stylis-plugin-rtl";
import { useLocale } from "next-intl";
import { prefixer } from "stylis";
import { getKidexTheme } from "@/theme/mui-theme";
import { ThemeModeProvider, useThemeMode } from "./ThemeModeContext";

function ThemedTree({ children }: { children: React.ReactNode }) {
  const { mode } = useThemeMode();
  const locale = useLocale();
  const direction: Direction = locale === "ar" ? "rtl" : "ltr";
  const theme = useMemo(() => getKidexTheme(mode, direction), [mode, direction]);
  const cache = useMemo(
    () =>
      createCache({
        key: direction === "rtl" ? "muirtl" : "mui",
        stylisPlugins: direction === "rtl" ? [prefixer, rtlPlugin] : [prefixer]
      }),
    [direction]
  );

  return (
    <CacheProvider value={cache}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </CacheProvider>
  );
}

export function MuiRegistry({ children }: { children: React.ReactNode }) {
  return (
    <AppRouterCacheProvider options={{ key: "mui" }}>
      <ThemeModeProvider>
        <ThemedTree>{children}</ThemedTree>
      </ThemeModeProvider>
    </AppRouterCacheProvider>
  );
}
