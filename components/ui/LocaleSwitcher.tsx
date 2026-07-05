"use client";

import { useMemo } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Select } from "@sovereignsquad/gds/client";
import { LOCALE_COOKIE } from "@/lib/locale-preference";
import { hasConsentFor } from "@/lib/cookie-consent";

export function LocaleSwitcher() {
  const locale = useLocale();
  const t = useTranslations("Common");
  const router = useRouter();
  const pathname = usePathname();

  function switchLocale(nextLocale: "en" | "hu" | "ar" | "es" | "de" | "he") {
    // Persist the explicit choice so locale-less entry remembers it (GH-422) —
    // but only with functional cookie consent (GH-423). Without consent the switch
    // still applies for this navigation; it just isn't remembered across sessions.
    if (hasConsentFor("functional")) {
      document.cookie = `${LOCALE_COOKIE}=${nextLocale}; path=/; max-age=31536000; samesite=lax`;
    }
    const cleanPath = pathname.replace(/^\/(en|hu|ar|es|de|he)(\/|$)/, "/");
    router.replace(cleanPath, { locale: nextLocale });
  }

  const localeLabel =
    locale === "ar" ? "AR" :
    locale === "hu" ? "HU" :
    locale === "es" ? "ES" :
    locale === "de" ? "DE" :
    locale === "he" ? "HE" :
    "EN";
  const languageOptions = useMemo(
    () => [
      { value: "en", label: t("languageEnglish") },
      { value: "hu", label: t("languageHungarian") },
      { value: "ar", label: t("languageArabic") },
      { value: "es", label: t("languageSpanish") },
      { value: "de", label: t("languageGerman") },
      { value: "he", label: t("languageHebrew") }
    ],
    [t]
  );

  return (
    <Select
      aria-label={`${t("languageSelector")} (${localeLabel})`}
      allowDeselect={false}
      data={languageOptions}
      onChange={(value) => {
        if (value === "en" || value === "hu" || value === "ar" || value === "es" || value === "de" || value === "he") {
          switchLocale(value);
        }
      }}
      size="sm"
      value={locale}
      w={170}
    />
  );
}
