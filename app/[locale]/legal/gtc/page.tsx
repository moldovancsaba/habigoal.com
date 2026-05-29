"use client";

import { useEffect, useMemo, useState } from "react";
import { Stack, Text } from "@mantine/core";
import { createGdsVocabularyPack, GdsIcons, PageHeader, SectionPanel, SemanticButton } from "@doneisbetter/gds/client";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { APP_VERSION } from "@/lib/app-version";
import { DEFAULT_HABIGOAL_SETTINGS, getSettings, type HabigoalSettings } from "@/services/settings-service";

export default function GtcPage() {
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
      <PageHeader title={t("gtcTitle")} subtitle={`${t("effectiveDate")}: ${settings.company.registered}`} />

      <SectionPanel title={t("scopeTitle")}>
        <Text size="sm">{t("scopeBody")}</Text>
      </SectionPanel>

      <SectionPanel title={t("serviceTitle")}>
        <Text size="sm">{t("serviceBody")}</Text>
      </SectionPanel>

      <SectionPanel title={t("responsibilityTitle")}>
        <Text size="sm">{t("responsibilityBody")}</Text>
      </SectionPanel>

      <SectionPanel title={t("companyDataTitle")}>
        <CompanyData settings={settings} />
        <Text size="sm" mt="xs">
          <strong>App:</strong> Habigoal v{APP_VERSION}
        </Text>
      </SectionPanel>

      <Link href="/dashboard" style={{ textDecoration: "none", alignSelf: "flex-start" }}>
        <SemanticButton action="legal:backToDashboard" variant="default" vocabularyPacks={[legalActionPack]} />
      </Link>
    </Stack>
  );
}

function CompanyData({ settings }: { settings: HabigoalSettings }) {
  const t = useTranslations("Legal");
  return (
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
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <Text size="sm">
      <strong>{label}:</strong> {value}
    </Text>
  );
}
