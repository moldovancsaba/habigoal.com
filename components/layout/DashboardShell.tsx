"use client";

import { AppShell, Box, Burger, Divider, Drawer, Group, NavLink, Stack, Text, Badge } from "@mantine/core";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { PageContainer } from "@/components/ui/PageContainer";
import { AppFooter } from "@/components/layout/AppFooter";
import { LocaleSwitcher } from "@/components/ui/LocaleSwitcher";
import { ThemeSwitcher } from "@/components/ui/ThemeSwitcher";
import { APP_LAYOUT } from "@/theme/tokens";
import { getNavStateCss } from "@/lib/semantic-theme";
import { useThemeMode } from "@/components/theme/ThemeModeContext";
import { BrandMark } from "@/components/ui/BrandMark";

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations("Dashboard");
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const sideInset = 14;
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

  const navContent = (
    <Stack h="100%" gap={0} style={{ background: "var(--sidebar-bg)" }}>
      <Box p="md" style={{ display: "flex", justifyContent: "center" }}>
        <BrandMark size={108} subtitle={t("brandName")} />
      </Box>

      <Stack px={sideInset} pb="sm" gap={4}>
        <Text fw={800} c="var(--nav-company-label)">{t("brandName")}</Text>
        <Text size="sm" c="var(--nav-company-description)">{t("brandSubtitle")}</Text>
      </Stack>

      {user && (
        <Stack gap={0} px={sideInset} pb="md" align="center">
          <Box
            className="glass-panel surface-outline"
            p="xs"
            style={{
              width: "100%",
              borderRadius: "var(--mantine-radius-md)",
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
        </Stack>
      )}

      <Group
        gap={8}
        p={8}
        justify="flex-start"
        style={{
          marginInline: sideInset,
          background: "linear-gradient(180deg, var(--surface-gradient-top), var(--surface-gradient-bottom)), var(--surface-base)",
          border: "1px solid var(--border-primary)",
          borderRadius: "var(--mantine-radius-md)"
        }}
      >
        <LocaleSwitcher />
        <ThemeSwitcher />
      </Group>
      <Stack gap={6} px={sideInset} py="md" style={{ flex: 1 }}>
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
              onClick={() => setMobileOpen(false)}
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
      <Divider color="var(--surface-section-border)" />
      <Box px={sideInset} py="md">
        <NavLink
          label={t("logout")}
          onClick={() => {
            // Use the GET route to trigger the full SSO logout redirect
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
      </Box>
      <Box h={16} />
    </Stack>
  );

  return (
    <>
      {routeBlocked ? null : (
      <Drawer
        opened={mobileOpen}
        onClose={() => setMobileOpen(false)}
        padding={0}
        withCloseButton={false}
        size={APP_LAYOUT.drawerWidth}
        hiddenFrom="md"
        styles={{
          content: {
            background: "var(--sidebar-bg)"
          },
          body: {
            padding: 0
          }
        }}
      >
        {navContent}
      </Drawer>
      )}

      <AppShell
        navbar={routeBlocked ? undefined : { width: APP_LAYOUT.drawerWidth, breakpoint: "md" }}
        padding={0}
        styles={{
          navbar: {
            borderInlineEnd: "none",
            background: "var(--sidebar-bg)"
          },
          main: {
            backgroundColor: "transparent"
          }
        }}
      >
        {!routeBlocked ? (
          <AppShell.Navbar visibleFrom="md" p={0}>
            {navContent}
          </AppShell.Navbar>
        ) : null}

        <AppShell.Main>
          <Box className="dashboard-main" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", paddingBottom: 16 }}>
            {!routeBlocked ? (
              <Box
                hiddenFrom="md"
                px={APP_LAYOUT.pageGutterMobile}
                pt={APP_LAYOUT.mobileNavInset}
                pb={8}
                style={{ display: "flex", alignItems: "center" }}
              >
                <Burger
                  opened={mobileOpen}
                  onClick={() => setMobileOpen((v) => !v)}
                  size="md"
                  color="var(--text-primary)"
                  bg="transparent"
                  styles={{
                    root: {
                      padding: 0,
                      minWidth: APP_LAYOUT.mobileNavSize,
                      minHeight: APP_LAYOUT.mobileNavSize,
                      border: "none",
                      boxShadow: "none",
                      background: "transparent"
                    }
                  }}
                />
              </Box>
            ) : null}
            <Box style={{ flex: 1 }}>
              <PageContainer>{children}</PageContainer>
            </Box>
            <AppFooter />
          </Box>
        </AppShell.Main>
      </AppShell>
    </>
  );
}
