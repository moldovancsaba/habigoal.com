"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionCard } from "@/components/ui/SectionCard";
import { APP_VERSION, COMPANY_INFO } from "@/lib/company";

export default function PrivacyPolicyPage() {
  const t = useTranslations("Legal");

  return (
    <Stack spacing={2.5}>
      <PageHeader title={t("privacyTitle")} subtitle={`${t("effectiveDate")}: ${COMPANY_INFO.registered}`} />

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
          <Row label={t("companyDataTitle")} value={COMPANY_INFO.name} />
          <Row label={t("idNo")} value={COMPANY_INFO.ico} />
          <Row label={t("registered")} value={COMPANY_INFO.registered} />
          <Row label={t("legalForm")} value={COMPANY_INFO.legalForm} />
          <Row label={t("address")} value={COMPANY_INFO.address} />
          <Row label={t("shareCapital")} value={COMPANY_INFO.shareCapital} />
          <Row label={t("vatNo")} value={COMPANY_INFO.vatNo} />
          <Row label={t("website")} value={COMPANY_INFO.website} />
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
