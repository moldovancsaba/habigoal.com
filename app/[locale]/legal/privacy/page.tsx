"use client";

import { useEffect, useMemo, useState } from "react";
import { Stack, Text } from "@mantine/core";
import { createGdsVocabularyPack, GdsIcons, PageHeader, SectionPanel, SemanticButton } from "@sovereignsquad/gds/client";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { APP_VERSION } from "@/lib/app-version";
import { DEFAULT_HABIGOAL_SETTINGS, getSettings, type HabigoalSettings } from "@/services/settings-service";

export default function PrivacyPolicyPage() {
  const t = useTranslations("Legal");
  const [settings, setSettings] = useState<HabigoalSettings>(DEFAULT_HABIGOAL_SETTINGS);
  const legalActionPack = useMemo(
    () =>
      createGdsVocabularyPack("legal", {
        backToDashboard: {
          defaultMessage: t("backToDashboard"),
          icon: GdsIcons.Dashboard
        }
      }),
    [t]
  );

  useEffect(() => {
    void getSettings().then(setSettings).catch(() => null);
  }, []);

  return (
    <Stack gap="md">
      <PageHeader title={t("privacyTitle")} subtitle={`${t("effectiveDate")}: ${settings.company.registered}`} />

      <SectionPanel title={t("privacyCollectionTitle")}>
        <Text size="sm">{t("privacyCollectionBody")}</Text>
      </SectionPanel>

      <SectionPanel title={t("privacyUseTitle")}>
        <Text size="sm">{t("privacyUseBody")}</Text>
      </SectionPanel>

      <SectionPanel title={t("privacyRetentionTitle")}>
        <Text size="sm">{t("privacyRetentionBody")}</Text>
      </SectionPanel>

      <SectionPanel title={t("companyDataTitle")}>
        <Stack gap={6}>
          <Row label={t("companyDataTitle")} value={settings.company.name} />
          <Row label={t("idNo")} value={settings.company.ico} />
          <Row label={t("registered")} value={settings.company.registered} />
          <Row label={t("legalForm")} value={settings.company.legalForm} />
          <Row label={t("address")} value={settings.company.address} />
          <Row label={t("shareCapital")} value={settings.company.shareCapital} />
          <Row label={t("vatNo")} value={settings.company.vatNo} />
          <Row label={t("website")} value={settings.company.website} />
        </Stack>
        <Text size="sm" mt="xs">
          <strong>{t("appLabel")}</strong> Habigoal v{APP_VERSION}
        </Text>
      </SectionPanel>

      <Link href="/dashboard" style={{ textDecoration: "none", alignSelf: "flex-start" }}>
        <SemanticButton action="legal:backToDashboard" variant="default" vocabularyPacks={[legalActionPack]} />
      </Link>
    </Stack>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <Text size="sm">
      <strong>{label}:</strong> {value}
    </Text>
  );
}
