"use client";

import { ActionIcon, Box, Burger, Button, Group, Menu, Text } from "@mantine/core";
import { GdsIcons } from "@doneisbetter/gds/client";
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
  const languageOptions: Array<{ label: string; shortLabel: string; value: SupportedLocale }> = [
    { label: common("languageEnglish"), shortLabel: "EN", value: "en" },
    { label: common("languageHungarian"), shortLabel: "HU", value: "hu" },
    { label: common("languageArabic"), shortLabel: "AR", value: "ar" },
    { label: common("languageSpanish"), shortLabel: "ES", value: "es" },
    { label: common("languageGerman"), shortLabel: "DE", value: "de" },
    { label: common("languageHebrew"), shortLabel: "HE", value: "he" }
  ];

  return (
    <Group className="public-app-controls" gap="xs" wrap="nowrap">
      <Group className="public-desktop-controls" gap="xs" wrap="nowrap">
        <Menu shadow="md" width={180} position="bottom-end">
          <Menu.Target>
            <ActionIcon variant="default" color="gray" size={compact ? "md" : "lg"} radius="md" aria-label={common("languageSelector")} title={common("languageSelector")}>
              <Text fw={800} size="sm">{localeLabel}</Text>
            </ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>
            {languageOptions.map((language) => (
              <Menu.Item
                key={language.value}
                onClick={() => switchLocale(language.value)}
                rightSection={locale === language.value ? <GdsIcons.Check size={14} /> : null}
              >
                {language.label}
              </Menu.Item>
            ))}
          </Menu.Dropdown>
        </Menu>

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

      <Box className="public-mobile-menu">
        <Menu opened={mobileMenuOpened} onChange={setMobileMenuOpened} shadow="md" width={260} position="bottom-end">
          <Menu.Target>
            <Burger
              className="public-mobile-menu-trigger"
              opened={mobileMenuOpened}
              size="sm"
              aria-label={common("menu")}
              title={common("menu")}
            />
          </Menu.Target>
          <Menu.Dropdown>
            {mobileNewsHref && mobileNewsLabel ? (
              <>
                <Menu.Item component={Link} href={mobileNewsHref} leftSection={<GdsIcons.Notifications size={16} />}>
                  {mobileNewsLabel}
                </Menu.Item>
                <Menu.Divider />
              </>
            ) : null}

            {authResolved && user ? (
              <>
                <Menu.Item component={Link} href={dashboardHref} leftSection={<GdsIcons.Dashboard size={16} />}>
                  {common("openDashboard")}
                </Menu.Item>
                <Menu.Item component="a" href="/api/auth/logout" leftSection={<GdsIcons.Back size={16} />}>
                  {common("logout")}
                </Menu.Item>
                <Menu.Divider />
              </>
            ) : (
              <>
                <Menu.Item component="a" href={loginHref} leftSection={<GdsIcons.Profile size={16} />}>
                  {landing("login")}
                </Menu.Item>
                <Menu.Divider />
              </>
            )}

            <Menu.Label>{common("languageSelector")}</Menu.Label>
            {languageOptions.map((language) => (
              <Menu.Item
                key={language.value}
                leftSection={<Text fw={900} size="sm">{language.shortLabel}</Text>}
                onClick={() => switchLocale(language.value)}
                rightSection={locale === language.value ? <GdsIcons.Check size={14} /> : null}
              >
                {language.label}
              </Menu.Item>
            ))}
          </Menu.Dropdown>
        </Menu>
      </Box>
    </Group>
  );
}
