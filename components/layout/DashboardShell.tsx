"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { AppFooter } from "@/components/layout/AppFooter";
import { AppShell as GdsAppShell, Box, Select, SidebarNav, SidebarNavItem, Stack } from "@sovereignsquad/gds/client";
import { APP_LAYOUT } from "@/theme/tokens";
import { OnboardingProvider } from "@/components/onboarding/OnboardingPrompt";
import { PendingInvitations } from "@/components/teams/PendingInvitations";
import { ProductThemeBoundary } from "@/components/product/ProductThemeBoundary";
import { getRouteChromeContract, resolveProductSurfaceFromPathname } from "@/lib/product-ui-contracts";

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations("Dashboard");
  const pathname = usePathname();
  const router = useRouter();
  const chromeContract = getRouteChromeContract(pathname);
  const activeSurface = chromeContract.activeSurface;

  const [user, setUser] = useState<{ name: string; email: string; primaryRole?: string; athleteId?: string } | null>(null);
  const [authResolved, setAuthResolved] = useState(false);

  useEffect(() => {
    // Tell /api/auth/me which surface we are on so it scopes the entitlement
    // payload to the active surface (consumer Habigoal vs professional Athlete
    // IQ) when dashboard-owned routes ask for user/navigation context.
    const authSurface = resolveProductSurfaceFromPathname(pathname) === "habigoal" ? "habigoal" : "athlete-iq";
    fetch(`/api/auth/me?surface=${authSurface}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setUser(data.user);
        }
      })
      .catch(() => {})
      .finally(() => setAuthResolved(true));
    // Re-fetch on surface change so switching between products re-scopes the payload.
  }, [pathname]);

  useEffect(() => {
    if (!authResolved || !user) return;

    const locale = pathname.match(/^\/(hu|en|ar|es|de|he)(\/|$)/)?.[1] || "en";
    const athleteHome = user.athleteId ? `/${locale}/athletes/${user.athleteId}` : `/${locale}/athletes`;
    const trainerHome = `/${locale}/dashboard`;

    if (user.primaryRole === "parent" && pathname.startsWith(`/${locale}/dashboard`) && !pathname.startsWith(`/${locale}/dashboard/parent`)) {
      router.replace(`/${locale}/dashboard/parent`);
      return;
    }

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
      (user.primaryRole === "parent" && pathname.startsWith(`/${locale}/dashboard`) && !pathname.startsWith(`/${locale}/dashboard/parent`)) ||
      (user.primaryRole === "trainer" && pathname.startsWith(`/${locale}/dashboard/settings`))
    );
  const nav = [
    ...(primaryRole === "parent" ? [
      { href: "/dashboard/parent", label: t("parentPortal"), action: "users" as const },
      { href: "/dashboard/reports", label: t("reports"), action: "dashboard" as const },
    ] : []),
    // The dashboard menu links to product-owned athlete routes without taking
    // over their app chrome.
    ...(primaryRole === "athlete" ? [
      { href: "/habigoal", label: t("navAthleteToday"), action: "record" as const },
      { href: "/athlete-iq", label: t("navAthleteIq"), action: "dashboard" as const },
      ...(user?.athleteId ? [{ href: `/athletes/${user.athleteId}`, label: t("navAthleteProgress"), action: "dashboard" as const }] : []),
      { href: "/dashboard/assessment", label: t("survey"), action: "record" as const },
    ] : []),
    ...(primaryRole === "admin" || primaryRole === "trainer" || primaryRole === "performance_coach" || primaryRole === "physio" ? [
      { href: "/dashboard", label: t("overview") },
      { href: "/dashboard/coach", label: t("coachHub"), action: "dashboard" as const },
      { href: "/dashboard/planning", label: t("planning"), action: "calendar" as const },
      { href: "/dashboard/athletes", label: t("children"), action: "users" as const },
      { href: "/dashboard/reports", label: t("reports"), action: "dashboard" as const },
      { href: "/dashboard/wearables", label: t("wearables"), action: "dashboard" as const },
      { href: "/dashboard/injury-hub/fms", label: t("injuryHub"), action: "record" as const },
      { href: "/dashboard/assessment", label: t("survey"), action: "record" as const }
    ] : []),
    ...(primaryRole === "admin" ? [{ href: "/dashboard/settings", label: t("settings"), action: "settings" as const }] : [])
  ];

  const primaryNavigation = (
    <SidebarNav ariaLabel={t("brandName")}>
      {nav.map((item) => {
        const active =
          item.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <SidebarNavItem
            key={item.href}
            component={Link}
            href={item.href}
            label={item.label}
            action={item.action ?? "dashboard"}
            active={active}
          />
        );
      })}
    </SidebarNav>
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
        <SidebarNavItem
          action="logout"
          label={t("logout")}
          onClick={() => {
            window.location.href = "/api/auth/logout";
          }}
        />
    </Stack>
  );

  return (
    <ProductThemeBoundary surface={activeSurface} frame={false}>
      <GdsAppShell
        logoText={t("brandName")}
        headerContext={t("brandSubtitle")}
        headerActions={routeBlocked ? undefined : <ShellLocaleSwitcher />}
        showThemeToggle={false}
        primaryNavigation={routeBlocked ? undefined : primaryNavigation}
        accountPanel={routeBlocked ? undefined : accountPanel}
      >
        <Box className="dashboard-main" style={{ minHeight: "calc(100vh - 60px)", display: "flex", flexDirection: "column", paddingBottom: 16 }}>
          <Box style={{ flex: 1 }}>
            <Box
              style={{
                width: "100%",
                maxWidth: APP_LAYOUT.pageMaxWidth,
                marginInline: "auto"
              }}
              px={{ base: APP_LAYOUT.pageGutterMobile, sm: APP_LAYOUT.pageGutterTablet, md: APP_LAYOUT.pageGutterDesktop }}
              pt={{ base: 8, sm: 24 }}
            >
              {routeBlocked ? null : <PendingInvitations />}
              <OnboardingProvider>{children}</OnboardingProvider>
            </Box>
          </Box>
          <AppFooter />
        </Box>
      </GdsAppShell>
    </ProductThemeBoundary>
  );
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
    <Select
      aria-label={`${t("languageSelector")} (${localeLabel})`}
      allowDeselect={false}
      className="gds-product-overlay-control"
      data={[
        { value: "en", label: t("languageEnglish") },
        { value: "hu", label: t("languageHungarian") },
        { value: "ar", label: t("languageArabic") },
        { value: "es", label: t("languageSpanish") },
        { value: "de", label: t("languageGerman") },
        { value: "he", label: t("languageHebrew") }
      ]}
      onChange={(value) => {
        if (value === "en" || value === "hu" || value === "ar" || value === "es" || value === "de" || value === "he") {
          switchLocale(value);
        }
      }}
      size="sm"
      value={locale}
      w={140}
    />
  );
}
