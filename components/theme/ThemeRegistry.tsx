"use client";

import { MantineProvider } from "@mantine/core";
import { useMemo } from "react";
import { useLocale } from "next-intl";
import { getSurveyMantineTheme } from "@/theme/mantine-theme";
import { ThemeModeProvider, useThemeMode } from "./ThemeModeContext";

function ThemedTree({ children }: { children: React.ReactNode }) {
  const { mode } = useThemeMode();
  const locale = useLocale();
  const direction: "ltr" | "rtl" = locale === "ar" || locale === "he" ? "rtl" : "ltr";
  const mantineTheme = useMemo(() => getSurveyMantineTheme(mode, direction), [mode, direction]);

  return (
    <MantineProvider theme={mantineTheme} forceColorScheme={mode}>
      {children}
    </MantineProvider>
  );
}

export function ThemeRegistry({
  children,
  initialMode
}: {
  children: React.ReactNode;
  initialMode?: "light" | "dark";
}) {
  return (
    <ThemeModeProvider initialMode={initialMode}>
      <ThemedTree>{children}</ThemedTree>
    </ThemeModeProvider>
  );
}
