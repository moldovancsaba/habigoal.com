"use client";

import { useEffect, useState } from "react";
import { Box, Divider, Group, Text } from "@mantine/core";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { APP_VERSION } from "@/lib/app-version";
import { DEFAULT_KIDEX_SETTINGS, getSettings, type KidexSettings } from "@/services/settings-service";

export function AppFooter() {
  const t = useTranslations("Dashboard");
  const [settings, setSettings] = useState<KidexSettings>(DEFAULT_KIDEX_SETTINGS);

  useEffect(() => {
    void getSettings().then(setSettings).catch(() => null);
  }, []);

  return (
    <Box component="footer" className="no-print" mt="xl" px={{ base: "md", sm: "lg" }} pb={{ base: "xs", sm: "sm" }}>
      <Divider mb="sm" />
      <Group justify="space-between" align="center" gap="sm">
        <Group gap="xs" wrap="wrap">
          <Text component={Link} href="/dashboard/legal/gtc" size="sm" c="dimmed" style={{ textDecoration: "none" }}>
            {t("gtc")}
          </Text>
          <Text size="sm" c="dimmed">
            |
          </Text>
          <Text component={Link} href="/dashboard/legal/privacy" size="sm" c="dimmed" style={{ textDecoration: "none" }}>
            {t("privacyPolicy")}
          </Text>
        </Group>

        <Text size="sm" c="dimmed">
          {settings.company.name} · v{APP_VERSION}
        </Text>
      </Group>
    </Box>
  );
}
