"use client";

import { useState } from "react";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useSyncExternalStore } from "react";

const CONSENT_COOKIE_NAME = "kidex_cookie_consent";
const THEME_COOKIE_NAME = "kidex_theme";
const LEGACY_THEME_STORAGE_KEY = "theme";

function hasConsentCookie() {
  if (typeof document === "undefined") return false;
  return document.cookie.split("; ").some((cookie) => cookie.startsWith(`${CONSENT_COOKIE_NAME}=accepted`));
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
      localStorage.getItem(LEGACY_THEME_STORAGE_KEY) ??
      document.documentElement.getAttribute("data-theme") ??
      "light";
    if (themeValue === "light" || themeValue === "dark") {
      document.cookie = `${THEME_COOKIE_NAME}=${themeValue}; path=/; max-age=31536000; samesite=lax`;
    }
    setDismissed(true);
  }

  if (dismissed || consentAccepted) return null;

  return (
    <Paper
      elevation={8}
      sx={{
        position: "fixed",
        left: 16,
        right: 16,
        bottom: 16,
        zIndex: (theme) => theme.zIndex.snackbar
      }}
    >
      <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} sx={{ p: 2, alignItems: { md: "center" }, justifyContent: "space-between" }}>
        <Typography variant="body2">
          {t("cookieConsentMessage")}{" "}
          <Link href="/dashboard/legal/privacy">{t("cookiePolicyLink")}</Link>
        </Typography>
        <Button variant="contained" onClick={acceptCookies}>
          {t("cookieAccept")}
        </Button>
      </Stack>
    </Paper>
  );
}
