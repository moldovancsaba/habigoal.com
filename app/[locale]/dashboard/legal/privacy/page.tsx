"use client";

import { useEffect, useState } from "react";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionCard } from "@/components/ui/SectionCard";
import { APP_VERSION } from "@/lib/app-version";
import { DEFAULT_KIDEX_SETTINGS, getSettings, type KidexSettings } from "@/services/settings-service";

export default function PrivacyPolicyPage() {
  const t = useTranslations("Legal");
  const [settings, setSettings] = useState<KidexSettings>(DEFAULT_KIDEX_SETTINGS);

  useEffect(() => {
    void getSettings().then(setSettings).catch(() => null);
  }, []);

  return (
    <Stack spacing={2.5}>
      <PageHeader title={t("privacyTitle")} subtitle={`${t("effectiveDate")}: ${settings.company.registered}`} />

      <SectionCard title={t("privacyCollectionTitle")}>
        <Typography variant="body2">{t("privacyCollectionBody")}</Typography>
      </SectionCard>

      <SectionCard title={t("privacyUseTitle")}>
        <Typography variant="body2">{t("privacyUseBody")}</Typography>
      </SectionCard>

      <SectionCard title={t("privacyRetentionTitle")}>
        <Typography variant="body2">{t("privacyRetentionBody")}</Typography>
      </SectionCard>

      <SectionCard title={t("companyDataTitle")}>
        <Stack spacing={0.75}>
          <Row label={t("companyDataTitle")} value={settings.company.name} />
          <Row label={t("idNo")} value={settings.company.ico} />
          <Row label={t("registered")} value={settings.company.registered} />
          <Row label={t("legalForm")} value={settings.company.legalForm} />
          <Row label={t("address")} value={settings.company.address} />
          <Row label={t("shareCapital")} value={settings.company.shareCapital} />
          <Row label={t("vatNo")} value={settings.company.vatNo} />
          <Row label={t("website")} value={settings.company.website} />
        </Stack>
        <Typography variant="body2" sx={{ mt: 1 }}>
          <strong>App:</strong> KIDEX v{APP_VERSION}
        </Typography>
      </SectionCard>

      <Button component={Link} href="/dashboard" variant="outlined" sx={{ alignSelf: "flex-start" }}>
        {t("backToDashboard")}
      </Button>
    </Stack>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <Typography variant="body2">
      <strong>{label}:</strong> {value}
    </Typography>
  );
}
