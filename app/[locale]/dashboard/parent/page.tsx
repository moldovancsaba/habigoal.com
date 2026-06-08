"use client";

import { useEffect, useState } from "react";
import { Box, Loader, Stack, Text, Group, Paper } from "@mantine/core";
import { PageHeader, SectionPanel, SemanticButton, StateBlock } from "@doneisbetter/gds/client";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { AthleteProfile } from "@/types/athlete";

export default function ParentPortalPage() {
  const t = useTranslations("ParentPortal");
  const [athletes, setAthletes] = useState<AthleteProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/athletes")
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        setAthletes(Array.isArray(data) ? data : data.athletes ?? []);
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  if (loading) {
    return <Box style={{ display: "flex", justifyContent: "center", paddingBlock: "2rem" }}><Loader /></Box>;
  }

  if (error) {
    return <Box p="xl"><StateBlock variant="error" title={t("loadError")} /></Box>;
  }

  return (
    <Stack gap="xl" pb="xl">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <SectionPanel title={t("linkedAthletes")}>
        <Stack gap="md">
          {athletes.length === 0 && <Text c="dimmed">{t("noLinked")}</Text>}
          {athletes.map((athlete) => (
            <Paper withBorder key={athlete._id} p="md">
              <Group justify="space-between">
                <Box>
                  <Text fw={700}>{athlete.name}</Text>
                  <Text size="sm" c="dimmed">{athlete.status ?? "active"}</Text>
                </Box>
                <Group>
                  <Link href={`/dashboard/reports?athleteId=${athlete._id}`}>
                    <SemanticButton action="dashboard" variant="light">{t("reports")}</SemanticButton>
                  </Link>
                  <Link href={`/dashboard/digital-twin?athleteId=${athlete._id}`}>
                    <SemanticButton action="dashboard" variant="outline">{t("digitalTwin")}</SemanticButton>
                  </Link>
                </Group>
              </Group>
            </Paper>
          ))}
        </Stack>
      </SectionPanel>
    </Stack>
  );
}
