"use client";

import { GdsProvider } from "@doneisbetter/gds-theme/client";
import { useMemo } from "react";
import { useLocale } from "next-intl";
import { getHabigoalMantineTheme } from "@/theme/mantine-theme";
import { ThemeModeProvider, useThemeMode } from "./ThemeModeContext";

function ThemedTree({ children }: { children: React.ReactNode }) {
  const { mode } = useThemeMode();
  const locale = useLocale();
  const direction: "ltr" | "rtl" = locale === "ar" || locale === "he" ? "rtl" : "ltr";
  const mantineTheme = useMemo(() => getHabigoalMantineTheme(mode, direction), [mode, direction]);

  return (
    <GdsProvider key={`${locale}-${mode}`} locale={locale} theme={mantineTheme} defaultColorScheme={mode}>
      {children}
    </GdsProvider>
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
