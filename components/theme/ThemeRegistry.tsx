"use client";

import { GdsProvider } from "@sovereignsquad/gds/client";
import { useMemo } from "react";
import { useLocale } from "next-intl";
import { getHabigoalMantineTheme } from "@/theme/mantine-theme";
import { getAppGdsMessages } from "@/i18n/gds-messages";

// Habigoal is dark-only: the scheme is forced at the provider so no runtime
// toggle, cookie, or per-surface bridge can diverge from it.
export function ThemeRegistry({ children }: { children: React.ReactNode }) {
  const locale = useLocale();
  const direction: "ltr" | "rtl" = locale === "ar" || locale === "he" ? "rtl" : "ltr";
  const mantineTheme = useMemo(() => getHabigoalMantineTheme(direction), [direction]);
  const gdsMessages = useMemo(() => getAppGdsMessages(locale), [locale]);

  return (
    <GdsProvider
      key={locale}
      locale={locale}
      messages={gdsMessages}
      theme={mantineTheme}
      defaultColorScheme="dark"
      forceColorScheme="dark"
    >
      {children}
    </GdsProvider>
  );
}
