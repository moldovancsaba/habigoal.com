"use client";

import { Box, Button, GdsIcons, Group, Select, Stack } from "@sovereignsquad/gds/client";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Link, usePathname, useRouter } from "@/i18n/navigation";

type SupportedLocale = "en" | "hu" | "ar" | "es" | "de" | "he";

type AuthSummary = {
  primaryRole?: string;
};

type PublicAppControlsProps = {
  compact?: boolean;
  mobileNewsHref?: string;
  mobileNewsLabel?: string;
};

export function PublicAppControls({
  compact = false,
  mobileNewsHref,
  mobileNewsLabel
}: PublicAppControlsProps) {
  const common = useTranslations("Common");
  const landing = useTranslations("Landing");
  const locale = useLocale() as SupportedLocale;
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<AuthSummary | null>(null);
  const [authResolved, setAuthResolved] = useState(false);
  const [mobileMenuOpened, setMobileMenuOpened] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (data?.user) setUser(data.user);
      })
      .catch(() => {})
      .finally(() => setAuthResolved(true));
  }, []);

  function switchLocale(nextLocale: SupportedLocale) {
    const cleanPath = pathname.replace(/^\/(en|hu|ar|es|de|he)(\/|$)/, "/");
    router.replace(cleanPath, { locale: nextLocale });
  }

  const dashboardHref = user?.primaryRole === "athlete" ? "/athletes" : "/dashboard";
  const localeLabel = locale.toUpperCase();
  const currentPath = pathname && pathname !== "/"
    ? (pathname.startsWith(`/${locale}`) ? pathname : `/${locale}${pathname}`)
    : `/${locale}`;
  const loginHref = `/${locale}/login?next=${encodeURIComponent(currentPath)}`;
  const languageOptions: Array<{ label: string; value: SupportedLocale }> = [
    { label: common("languageEnglish"), value: "en" },
    { label: common("languageHungarian"), value: "hu" },
    { label: common("languageArabic"), value: "ar" },
    { label: common("languageSpanish"), value: "es" },
    { label: common("languageGerman"), value: "de" },
    { label: common("languageHebrew"), value: "he" }
  ];

  return (
    <Group className="public-app-controls" gap="xs" wrap="nowrap">
      <Group className="public-desktop-controls" gap="xs" wrap="nowrap">
        <Select
          aria-label={`${common("languageSelector")} (${localeLabel})`}
          allowDeselect={false}
          data={languageOptions.map(({ label, value }) => ({ label, value }))}
          onChange={(value) => {
            if (isSupportedLocale(value)) switchLocale(value);
          }}
          size={compact ? "xs" : "sm"}
          value={locale}
          w={compact ? 84 : 124}
        />

        {authResolved && user ? (
          <>
            <Button className="public-control-text-action" component={Link} href={dashboardHref} leftSection={<GdsIcons.Dashboard size={16} />} size={compact ? "xs" : "sm"} variant="light">
              {common("openDashboard")}
            </Button>
            {!compact ? (
              <Button className="public-control-text-action" component="a" href="/api/auth/logout" size="sm" variant="default">
                {common("logout")}
              </Button>
            ) : null}
          </>
        ) : (
          <Button className="public-control-text-action" component="a" href={loginHref} leftSection={<GdsIcons.Profile size={16} />} size={compact ? "xs" : "sm"} variant="filled">
            {landing("login")}
          </Button>
        )}
      </Group>

      <Box className="public-mobile-menu" style={{ position: "relative" }}>
        <Button
          className="public-mobile-menu-trigger"
          variant="default"
          aria-expanded={mobileMenuOpened}
          aria-label={common("menu")}
          title={common("menu")}
          onClick={() => setMobileMenuOpened((opened) => !opened)}
        >
          {mobileMenuOpened ? <GdsIcons.Close size={20} aria-hidden="true" /> : <GdsIcons.Menu size={20} aria-hidden="true" />}
        </Button>
        {mobileMenuOpened ? (
          <Stack
            role="menu"
            className="glass-panel surface-outline"
            gap="xs"
            p="sm"
            style={{
              position: "absolute",
              right: 0,
              top: "calc(100% + 8px)",
              width: 260,
              zIndex: 500
            }}
          >
            {mobileNewsHref && mobileNewsLabel ? (
              <Button component={Link} href={mobileNewsHref} leftSection={<GdsIcons.Notifications size={16} />} variant="subtle" fullWidth onClick={() => setMobileMenuOpened(false)}>
                {mobileNewsLabel}
              </Button>
            ) : null}

            {authResolved && user ? (
              <>
                <Button component={Link} href={dashboardHref} leftSection={<GdsIcons.Dashboard size={16} />} variant="subtle" fullWidth onClick={() => setMobileMenuOpened(false)}>
                  {common("openDashboard")}
                </Button>
                <Button component="a" href="/api/auth/logout" leftSection={<GdsIcons.Back size={16} />} variant="subtle" fullWidth>
                  {common("logout")}
                </Button>
              </>
            ) : (
              <Button component="a" href={loginHref} leftSection={<GdsIcons.Profile size={16} />} variant="subtle" fullWidth>
                {landing("login")}
              </Button>
            )}

            <Select
              aria-label={`${common("languageSelector")} (${localeLabel})`}
              allowDeselect={false}
              data={languageOptions.map(({ label, value }) => ({ label, value }))}
              onChange={(value) => {
                if (isSupportedLocale(value)) {
                  switchLocale(value);
                  setMobileMenuOpened(false);
                }
              }}
              value={locale}
            />
          </Stack>
        ) : null}
      </Box>
    </Group>
  );
}

function isSupportedLocale(value: unknown): value is SupportedLocale {
  return value === "en" || value === "hu" || value === "ar" || value === "es" || value === "de" || value === "he";
}
