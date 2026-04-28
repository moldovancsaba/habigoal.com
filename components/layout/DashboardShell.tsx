"use client";

import { AppShell, Box, Burger, Divider, Drawer, Group, NavLink, Stack, Text } from "@mantine/core";
import Image from "next/image";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { PageContainer } from "@/components/ui/PageContainer";
import { AppFooter } from "@/components/layout/AppFooter";
import { LocaleSwitcher } from "@/components/ui/LocaleSwitcher";
import { ThemeSwitcher } from "@/components/ui/ThemeSwitcher";
import { KIDEX_COLORS, KIDEX_LAYOUT } from "@/theme/tokens";

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations("Dashboard");
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const nav = [
    { href: "/dashboard", label: t("overview") },
    { href: "/dashboard/assessment", label: t("survey") },
    { href: "/dashboard/records", label: t("records") },
    { href: "/dashboard/children", label: t("children") },
    { href: "/dashboard/settings", label: t("settings") }
  ];

  const navContent = (
    <Stack h="100%" gap={0} bg={KIDEX_COLORS.brandNavy}>
      <Box p="md" style={{ display: "flex", justifyContent: "center" }}>
        <Box style={{ backgroundColor: KIDEX_COLORS.white, borderRadius: "var(--mantine-radius-md)", padding: 12 }}>
          <Image src="/logo.jpeg" alt="KIDEX" width={100} height={100} priority />
        </Box>
      </Box>
      <Stack gap={6} px="sm" pb="md" style={{ flex: 1 }}>
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
                  borderRadius: "var(--mantine-radius-md)"
                },
                label: {
                  color: KIDEX_COLORS.navTextMuted,
                  fontWeight: 500
                },
                section: {
                  color: KIDEX_COLORS.navTextMuted
                }
              }}
              c={KIDEX_COLORS.navTextMuted}
              bg={active ? KIDEX_COLORS.brandTeal : "transparent"}
            />
          );
        })}
      </Stack>
      <Divider color={KIDEX_COLORS.navBorderMuted} />
      <Box h={16} />
    </Stack>
  );

  return (
    <>
      <Drawer
        opened={mobileOpen}
        onClose={() => setMobileOpen(false)}
        padding={0}
        withCloseButton={false}
        size={KIDEX_LAYOUT.drawerWidth}
        hiddenFrom="md"
        styles={{
          content: {
            backgroundColor: KIDEX_COLORS.brandNavy
          },
          body: {
            padding: 0
          }
        }}
      >
        {navContent}
      </Drawer>

      <AppShell
        header={{ height: 56, collapsed: false }}
        navbar={{ width: KIDEX_LAYOUT.drawerWidth, breakpoint: "md" }}
        padding={0}
        styles={{
          header: {
            backgroundColor: KIDEX_COLORS.white,
            color: KIDEX_COLORS.navText,
            borderBottomColor: KIDEX_COLORS.navBorder
          },
          navbar: {
            borderInlineEnd: "none",
            backgroundColor: KIDEX_COLORS.brandNavy
          },
          main: {
            backgroundColor: "var(--mantine-color-body)"
          }
        }}
      >
        <AppShell.Header>
          <Group h="100%" px="md" justify="space-between">
            <Group gap="xs">
              <Burger opened={mobileOpen} onClick={() => setMobileOpen((v) => !v)} size="sm" hiddenFrom="md" />
              <Text fw={700} hiddenFrom="md">KIDEX</Text>
            </Group>
            <Group gap={6}>
              <LocaleSwitcher />
              <ThemeSwitcher />
            </Group>
          </Group>
        </AppShell.Header>

        <AppShell.Navbar visibleFrom="md" p={0}>
          {navContent}
        </AppShell.Navbar>

        <AppShell.Main>
          <Box className="dashboard-main" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", paddingBottom: 16 }}>
            <Box style={{ flex: 1 }} pt={56}>
              <PageContainer>{children}</PageContainer>
            </Box>
            <AppFooter />
          </Box>
        </AppShell.Main>
      </AppShell>
    </>
  );
}
