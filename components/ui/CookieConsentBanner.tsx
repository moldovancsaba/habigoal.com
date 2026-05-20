"use client";

import { useState } from "react";
import { Button, Paper, Stack, Text } from "@mantine/core";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useSyncExternalStore } from "react";

const CONSENT_COOKIE_NAME = "habigoal_cookie_consent";
const LEGACY_CONSENT_COOKIE_NAMES = ["survey_cookie_consent", "kidex_cookie_consent"];
const THEME_COOKIE_NAME = "habigoal_theme";
const LEGACY_THEME_COOKIE_NAMES = ["survey_theme", "kidex_theme"];
const LEGACY_THEME_STORAGE_KEY = "theme";

function hasConsentCookie() {
  if (typeof document === "undefined") return false;
  return document.cookie.split("; ").some((cookie) =>
    cookie.startsWith(`${CONSENT_COOKIE_NAME}=accepted`) ||
    LEGACY_CONSENT_COOKIE_NAMES.some((name) => cookie.startsWith(`${name}=accepted`))
  );
}

export function CookieConsentBanner() {
  const t = useTranslations("Common");
  const consentAccepted = useSyncExternalStore(
    () => () => undefined,
    () => hasConsentCookie(),
    () => false
  );
  const [dismissed, setDismissed] = useState(false);

  function acceptCookies() {
    document.cookie = `${CONSENT_COOKIE_NAME}=accepted; path=/; max-age=31536000; samesite=lax`;
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
          <Link href="/dashboard/legal/privacy">{t("cookiePolicyLink")}</Link>
        </Text>
        <Button color="ingress" onClick={acceptCookies}>
          {t("cookieAccept")}
        </Button>
      </Stack>
    </Paper>
  );
}
