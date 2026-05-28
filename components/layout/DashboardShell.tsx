"use client";

import { ActionIcon, Badge, Box, Group, Menu, NavLink, Stack, Text, useComputedColorScheme } from "@mantine/core";
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { AppFooter } from "@/components/layout/AppFooter";
import { AppShell as GdsAppShell } from "@doneisbetter/gds/client";
import { APP_LAYOUT } from "@/theme/tokens";
import { getNavStateCss } from "@/theme/semantic-theme";
import { useThemeMode } from "@/components/theme/ThemeModeContext";

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations("Dashboard");
  const pathname = usePathname();
  const router = useRouter();
  const { mode } = useThemeMode();

  const [user, setUser] = useState<{ name: string; email: string; primaryRole?: string; athleteId?: string } | null>(null);
  const [authResolved, setAuthResolved] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setUser(data.user);
        }
      })
      .catch(() => {})
      .finally(() => setAuthResolved(true));
  }, []);

  useEffect(() => {
    if (!authResolved || !user) return;

    const locale = pathname.match(/^\/(hu|en|ar|es|de|he)(\/|$)/)?.[1] || "en";
    const athleteHome = user.athleteId ? `/${locale}/athletes/${user.athleteId}` : `/${locale}/athletes`;
    const trainerHome = `/${locale}/dashboard`;

    if (user.primaryRole === "athlete" && pathname.startsWith(`/${locale}/dashboard`) && !pathname.startsWith(`/${locale}/dashboard/assessment`)) {
      router.replace(athleteHome);
      return;
    }

    if (user.primaryRole === "trainer" && pathname.startsWith(`/${locale}/dashboard/settings`)) {
      router.replace(trainerHome);
    }
  }, [authResolved, pathname, router, user]);

  const primaryRole = user?.primaryRole || "trainer";
  const locale = pathname.match(/^\/(hu|en|ar|es|de|he)(\/|$)/)?.[1] || "en";
  const routeBlocked =
    !!user &&
    (
      (user.primaryRole === "athlete" && pathname.startsWith(`/${locale}/dashboard`) && !pathname.startsWith(`/${locale}/dashboard/assessment`)) ||
      (user.primaryRole === "trainer" && pathname.startsWith(`/${locale}/dashboard/settings`))
    );
  const nav = [
    ...(primaryRole === "admin" || primaryRole === "trainer" ? [
      { href: "/dashboard", label: t("overview") },
      { href: "/dashboard/assessment", label: t("survey") },
      { href: "/dashboard/athletes", label: t("children") },
      { href: "/dashboard/planning", label: t("planning") }
    ] : []),
    ...(primaryRole === "admin" ? [{ href: "/dashboard/settings", label: t("settings") }] : [])
  ];

  const primaryNavigation = (
      <Stack gap={6}>
        {nav.map((item) => {
          const active =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <NavLink
              key={item.href}
              component={Link}
              href={item.href}
              label={item.label}
              active={active}
              styles={{
                root: {
                  ...getNavStateCss(mode, active ? "ingress" : "neutral", active),
                  borderRadius: "var(--mantine-radius-md)",
                  paddingInlineStart: 16,
                  paddingInlineEnd: 16,
                  minHeight: 46
                },
                body: { paddingInlineStart: 0 },
                label: {
                  color: active ? "var(--nav-link-active)" : "var(--nav-link-inactive)",
                  fontWeight: active ? 700 : 500,
                  textAlign: "left"
                },
                section: {
                  color: active ? "var(--nav-link-active)" : "var(--nav-link-inactive)"
                }
              }}
              leftSection={active ? <Badge variant="light" color="ingress" circle size="sm" /> : undefined}
            />
          );
        })}
      </Stack>
  );

  const accountPanel = (
    <Stack gap="sm">
      {user ? (
        <Box
          className="glass-panel surface-outline"
          p="xs"
          style={{
            width: "100%",
            borderRadius: "var(--mantine-radius-md)"
          }}
        >
          <Stack gap={0}>
            <Box style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: "0.9rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {user.name}
            </Box>
            <Box style={{ color: "var(--text-secondary)", fontSize: "0.75rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {user.email}
            </Box>
          </Stack>
        </Box>
      ) : null}
        <NavLink
          label={t("logout")}
          onClick={() => {
            window.location.href = "/api/auth/logout";
          }}
          styles={{
            root: {
              borderRadius: "var(--mantine-radius-md)",
              paddingInlineStart: 16,
              paddingInlineEnd: 16,
              minHeight: 46
            },
            label: {
              color: "var(--nav-link-inactive)",
              fontWeight: 500,
              textAlign: "left"
            }
          }}
        />
    </Stack>
  );

  return (
    <GdsAppShell
      logoText={t("brandName")}
      headerContext={t("brandSubtitle")}
      headerActions={routeBlocked ? undefined : (
        <Group gap="xs" wrap="nowrap">
          <ShellThemeModeBridge />
          <ShellLocaleSwitcher />
        </Group>
      )}
      primaryNavigation={routeBlocked ? undefined : primaryNavigation}
      accountPanel={routeBlocked ? undefined : accountPanel}
    >
      <Box className="dashboard-main" style={{ minHeight: "calc(100vh - 60px)", display: "flex", flexDirection: "column", paddingBottom: 16 }}>
        <Box style={{ flex: 1 }}>
          <Box
            className="surface-outline"
            style={{
              width: "100%",
              maxWidth: APP_LAYOUT.pageMaxWidth,
              marginInline: "auto"
            }}
            px={{ base: APP_LAYOUT.pageGutterMobile, sm: APP_LAYOUT.pageGutterTablet, md: APP_LAYOUT.pageGutterDesktop }}
            pt={{ base: 8, sm: 24 }}
          >
            {children}
          </Box>
        </Box>
        <AppFooter />
      </Box>
    </GdsAppShell>
  );
}

function ShellThemeModeBridge() {
  const computedColorScheme = useComputedColorScheme("dark", { getInitialValueInEffect: true });
  const { mode, setMode } = useThemeMode();

  useEffect(() => {
    if ((computedColorScheme === "light" || computedColorScheme === "dark") && computedColorScheme !== mode) {
      setMode(computedColorScheme);
    }
  }, [computedColorScheme, mode, setMode]);

  return null;
}

function ShellLocaleSwitcher() {
  const locale = useLocale();
  const t = useTranslations("Common");
  const router = useRouter();
  const pathname = usePathname();

  function switchLocale(nextLocale: "en" | "hu" | "ar" | "es" | "de" | "he") {
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

  return (
    <Menu shadow="md" width={170} position="bottom-end">
      <Menu.Target>
        <ActionIcon variant="default" color="gray" size="lg" radius="md" aria-label={t("languageEnglish")}>
          <Text fw={700} size="sm">{localeLabel}</Text>
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item onClick={() => switchLocale("en")}>{t("languageEnglish")}</Menu.Item>
        <Menu.Item onClick={() => switchLocale("hu")}>{t("languageHungarian")}</Menu.Item>
        <Menu.Item onClick={() => switchLocale("ar")}>{t("languageArabic")}</Menu.Item>
        <Menu.Item onClick={() => switchLocale("es")}>{t("languageSpanish")}</Menu.Item>
        <Menu.Item onClick={() => switchLocale("de")}>{t("languageGerman")}</Menu.Item>
        <Menu.Item onClick={() => switchLocale("he")}>{t("languageHebrew")}</Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
