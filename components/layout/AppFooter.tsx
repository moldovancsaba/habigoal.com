"use client";

import { useEffect, useState } from "react";
import { Box, Divider, Group, Text } from "@mantine/core";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { APP_VERSION } from "@/lib/app-version";
import { DEFAULT_SURVEY_SETTINGS, getSettings, type SurveySettings } from "@/services/settings-service";

export function AppFooter() {
  const t = useTranslations("Dashboard");
  const [settings, setSettings] = useState<SurveySettings>(DEFAULT_SURVEY_SETTINGS);

  useEffect(() => {
    void getSettings().then(setSettings).catch(() => null);
  }, []);

  return (
    <Box component="footer" className="no-print glass-panel surface-outline" mt="xl" px={{ base: "md", sm: "lg" }} py="md" pb={{ base: "md", sm: "md" }} style={{ borderRadius: "var(--mantine-radius-md)" }}>
      <Divider mb="sm" />
      <Group justify="space-between" align="center" gap="sm">
        <Group gap="xs" wrap="wrap">
          <Text component={Link} href="/legal/gtc" size="sm" c="var(--text-secondary)" style={{ textDecoration: "none" }}>
            {t("gtc")}
          </Text>
          <Text size="sm" c="var(--text-muted)">
            |
          </Text>
          <Text component={Link} href="/legal/privacy" size="sm" c="var(--text-secondary)" style={{ textDecoration: "none" }}>
            {t("privacyPolicy")}
          </Text>
        </Group>

        <Text size="sm" c="var(--text-muted)">
          {settings.company.name} · v{APP_VERSION}
        </Text>
      </Group>
    </Box>
  );
}
