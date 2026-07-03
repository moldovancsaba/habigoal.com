"use client";

import { use } from "react";
import { Stack } from "@mantine/core";
import { PageHeader } from "@sovereignsquad/gds/client";
import { useTranslations } from "next-intl";
import { AthleteProfileAdminPanel } from "@/components/admin/AthleteProfileAdminPanel";

export default function AthleteProfileAdminPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations("AthleteProfileAdmin");

  return (
    <Stack gap="md">
      <PageHeader title={t("pageTitle")} subtitle={t("subtitle")} />
      <AthleteProfileAdminPanel athleteId={id} />
    </Stack>
  );
}
