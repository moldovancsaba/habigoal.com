"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { Paper, Stack, Text } from "@mantine/core";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { createGdsVocabularyPack, GdsIcons, SemanticButton } from "@doneisbetter/gds/client";
import { COOKIE_CONSENT_NAME, serializeCookieConsent, ACCEPT_ALL, ESSENTIAL_ONLY, parseCookieConsent } from "@/lib/cookie-consent";

const CONSENT_COOKIE_NAME = COOKIE_CONSENT_NAME;
const LEGACY_CONSENT_COOKIE_NAMES = ["survey_cookie_consent", "kidex_cookie_consent"];
const THEME_COOKIE_NAME = "habigoal_theme";
const LEGACY_THEME_COOKIE_NAMES = ["survey_theme", "kidex_theme"];
const LEGACY_THEME_STORAGE_KEY = "theme";

function readConsentCookieValue() {
  if (typeof document === "undefined") return null;
  const own = document.cookie.split("; ").find((c) => c.startsWith(`${CONSENT_COOKIE_NAME}=`));
  if (own) return own.slice(CONSENT_COOKIE_NAME.length + 1);
  const legacy = document.cookie
    .split("; ")
    .find((c) => LEGACY_CONSENT_COOKIE_NAMES.some((name) => c.startsWith(`${name}=`)));
  return legacy ? legacy.split("=")[1] : null;
}

// A choice has been made once the consent cookie parses to any category state.
function hasConsentCookie() {
  return parseCookieConsent(readConsentCookieValue()) !== null;
}

export function CookieConsentBanner() {
  const t = useTranslations("Common");
  const consentAccepted = useSyncExternalStore(
    () => () => undefined,
    () => hasConsentCookie(),
    () => false
  );
  const [dismissed, setDismissed] = useState(false);
  const consentActionPack = useMemo(
    () =>
      createGdsVocabularyPack("cookie", {
        accept: {
          defaultMessage: t("cookieAccept"),
          icon: GdsIcons.Check
        },
        essentialOnly: {
          defaultMessage: t("cookieRejectNonEssential"),
          icon: GdsIcons.Settings
        }
      }),
    [t]
  );

  function persistFunctionalTheme() {
    const themeValue =
      localStorage.getItem(THEME_COOKIE_NAME) ??
      LEGACY_THEME_COOKIE_NAMES.map((key) => localStorage.getItem(key)).find(Boolean) ??
      localStorage.getItem(LEGACY_THEME_STORAGE_KEY) ??
      document.documentElement.getAttribute("data-theme") ??
      "light";
    if (themeValue === "light" || themeValue === "dark") {
      document.cookie = `${THEME_COOKIE_NAME}=${themeValue}; path=/; max-age=31536000; samesite=lax`;
      LEGACY_THEME_COOKIE_NAMES.forEach((name) => {
        document.cookie = `${name}=; path=/; max-age=0; samesite=lax`;
      });
    }
  }

  function writeConsent(value: string) {
    document.cookie = `${CONSENT_COOKIE_NAME}=${value}; path=/; max-age=31536000; samesite=lax`;
  }

  function acceptAll() {
    writeConsent(serializeCookieConsent(ACCEPT_ALL));
    persistFunctionalTheme(); // theme is a functional cookie
    setDismissed(true);
  }

  function acceptEssentialOnly() {
    writeConsent(serializeCookieConsent(ESSENTIAL_ONLY));
    setDismissed(true);
  }

  if (dismissed || consentAccepted) return null;

  return (
    <Paper
      shadow="md"
      withBorder
      className="glass-panel surface-outline"
      style={{
        position: "fixed",
        left: 16,
        right: 16,
        bottom: 16,
        zIndex: 400
      }}
    >
      <Stack
        gap="sm"
        p="md"
        style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}
      >
        <Text size="sm">
          {t("cookieConsentMessage")}{" "}
          <Link href="/legal/privacy">{t("cookiePolicyLink")}</Link>
        </Text>
        <Stack gap="xs" style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap" }}>
          <SemanticButton
            action="cookie:essentialOnly"
            variant="default"
            color="gray"
            onClick={acceptEssentialOnly}
            vocabularyPacks={[consentActionPack]}
          />
          <SemanticButton
            action="cookie:accept"
            color="ingress"
            onClick={acceptAll}
            vocabularyPacks={[consentActionPack]}
          />
        </Stack>
      </Stack>
    </Paper>
  );
}
