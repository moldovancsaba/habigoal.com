"use client";

import { ActionIcon, Button, Group, Menu, Text } from "@mantine/core";
import { GdsIcons } from "@doneisbetter/gds/client";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Link, usePathname, useRouter } from "@/i18n/navigation";

type SupportedLocale = "en" | "hu" | "ar" | "es" | "de" | "he";

type AuthSummary = {
  primaryRole?: string;
};

export function PublicAppControls({ compact = false }: { compact?: boolean }) {
  const common = useTranslations("Common");
  const landing = useTranslations("Landing");
  const locale = useLocale() as SupportedLocale;
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<AuthSummary | null>(null);
  const [authResolved, setAuthResolved] = useState(false);

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
  const loginHref = `/api/auth/login?next=${encodeURIComponent(pathname || `/${locale}`)}`;

  return (
    <Group gap="xs" wrap="nowrap">
      <Menu shadow="md" width={180} position="bottom-end">
        <Menu.Target>
          <ActionIcon variant="default" color="gray" size={compact ? "md" : "lg"} radius="md" aria-label={common("languageEnglish")}>
            <Text fw={800} size="sm">{localeLabel}</Text>
          </ActionIcon>
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Item onClick={() => switchLocale("en")}>{common("languageEnglish")}</Menu.Item>
          <Menu.Item onClick={() => switchLocale("hu")}>{common("languageHungarian")}</Menu.Item>
          <Menu.Item onClick={() => switchLocale("ar")}>{common("languageArabic")}</Menu.Item>
          <Menu.Item onClick={() => switchLocale("es")}>{common("languageSpanish")}</Menu.Item>
          <Menu.Item onClick={() => switchLocale("de")}>{common("languageGerman")}</Menu.Item>
          <Menu.Item onClick={() => switchLocale("he")}>{common("languageHebrew")}</Menu.Item>
        </Menu.Dropdown>
      </Menu>

      {authResolved && user ? (
        <>
          <Button component={Link} href={dashboardHref} leftSection={<GdsIcons.Dashboard size={16} />} size={compact ? "xs" : "sm"} variant="light">
            {common("openDashboard")}
          </Button>
          {!compact ? (
            <Button component="a" href="/api/auth/logout" size="sm" variant="default">
              {common("logout")}
            </Button>
          ) : null}
        </>
      ) : (
        <Button component="a" href={loginHref} leftSection={<GdsIcons.Profile size={16} />} size={compact ? "xs" : "sm"} variant="filled">
          {landing("login")}
        </Button>
      )}
    </Group>
  );
}
