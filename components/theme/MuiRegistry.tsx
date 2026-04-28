"use client";

import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import { useMemo } from "react";
import { getKidexTheme } from "@/theme/mui-theme";
import { ThemeModeProvider, useThemeMode } from "./ThemeModeContext";

function ThemedTree({ children }: { children: React.ReactNode }) {
  const { mode } = useThemeMode();
  const theme = useMemo(() => getKidexTheme(mode), [mode]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
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
