"use client";

import { useState, useSyncExternalStore } from "react";
import { Button, GdsIcons, Stack } from "@sovereignsquad/gds/client";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { Paper, Text } from "@/components/gds/SurfacePrimitives";
import { COOKIE_CONSENT_NAME, serializeCookieConsent, ACCEPT_ALL, ESSENTIAL_ONLY, parseCookieConsent } from "@/lib/cookie-consent";
import { resolveProductSurfaceFromPathname } from "@/lib/product-ui-contracts";

const CONSENT_COOKIE_NAME = COOKIE_CONSENT_NAME;

function readConsentCookieValue() {
  if (typeof document === "undefined") return null;
  const own = document.cookie.split("; ").find((c) => c.startsWith(`${CONSENT_COOKIE_NAME}=`));
  return own ? own.slice(CONSENT_COOKIE_NAME.length + 1) : null;
}

// A choice has been made once the consent cookie parses to any category state.
function hasConsentCookie() {
  return parseCookieConsent(readConsentCookieValue()) !== null;
}

export function CookieConsentBanner() {
  const t = useTranslations("Common");
  const pathname = usePathname();
  const consentAccepted = useSyncExternalStore(
    () => () => undefined,
    () => hasConsentCookie(),
    () => false
  );
  const [dismissed, setDismissed] = useState(false);
  const activeSurface = resolveProductSurfaceFromPathname(pathname);

  function writeConsent(value: string) {
    document.cookie = `${CONSENT_COOKIE_NAME}=${value}; path=/; max-age=31536000; samesite=lax`;
  }

  function acceptAll() {
    writeConsent(serializeCookieConsent(ACCEPT_ALL));
    setDismissed(true);
  }

  function acceptEssentialOnly() {
    writeConsent(serializeCookieConsent(ESSENTIAL_ONLY));
    setDismissed(true);
  }

  if (dismissed || consentAccepted) return null;

  return (
    <Paper
      aria-label={t("cookieConsentMessage")}
      data-product-surface={activeSurface}
      role="region"
      shadow="md"
      withBorder
      className="cookie-consent-panel surface-outline"
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
          <Button
            className="gds-athlete-gold-button gds-athlete-gold-button-secondary"
            leftSection={<GdsIcons.Settings size={16} aria-hidden="true" />}
            variant="default"
            onClick={acceptEssentialOnly}
          >
            {t("cookieRejectNonEssential")}
          </Button>
          <Button
            className="gds-athlete-gold-button"
            leftSection={<GdsIcons.Check size={16} aria-hidden="true" />}
            onClick={acceptAll}
          >
            {t("cookieAccept")}
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}
