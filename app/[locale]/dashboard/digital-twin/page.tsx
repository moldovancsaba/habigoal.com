"use client";

import React, { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Paper, Text } from "@mantine/core";
import { Box, Group, Loader, PageHeader, Progress, SectionPanel, SimpleGrid, Stack, StateBlock } from "@sovereignsquad/gds/client";
import type { AthleteTwin } from "@/types/athlete-twin";
import { getProductColor } from "@/lib/product-ui-contracts";

function dimScore(value?: number): number {
  if (value == null || Number.isNaN(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

export default function DigitalTwinDashboard() {
  const t = useTranslations("DigitalTwin");
  const [twin, setTwin] = useState<AthleteTwin | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then(async (me) => {
        const athleteId = me?.athleteId ?? me?.user?.athleteId;
        if (!athleteId) {
          setError(t("errorNoAthlete"));
          setLoading(false);
          return;
        }
        const res = await fetch(`/api/athletes/${athleteId}/twin`);
        if (!res.ok) throw new Error("twin_load_failed");
        setTwin(await res.json());
      })
      .catch(() => setError(t("errorLoadFailed")))
      .finally(() => setLoading(false));
  }, [t]);

  if (loading) return <Box p="xl"><Loader /></Box>;
  if (error || !twin) {
    return (
      <Box p="xl">
        <StateBlock variant="info" title={t("emptyTitle")} description={error ?? t("emptyDescription")} />
      </Box>
    );
  }

  const dimensions = [
    { label: t("dimPhysical"), value: dimScore(twin.physical?.restingHeartRateBpm ? 100 - twin.physical.restingHeartRateBpm : undefined), sources: twin.physical?.sources },
    { label: t("dimPerformance"), value: dimScore(twin.recovery?.recoveryReadinessScore), sources: twin.performance?.sources },
    { label: t("dimTechnical"), value: dimScore(twin.technical?.movementSymmetryIndex ? twin.technical.movementSymmetryIndex * 100 : undefined), sources: twin.technical?.sources },
    { label: t("dimRecovery"), value: dimScore(twin.recovery?.sleepQualityScore7d), sources: twin.recovery?.sources },
    { label: t("dimCognitive"), value: dimScore(twin.cognitive?.moodTrend7d ? twin.cognitive.moodTrend7d * 10 : undefined), sources: twin.cognitive?.sources },
  ];

  return (
    <Box className="digital-twin-dashboard" pb="xl">
      <PageHeader
        title={t("title")}
        subtitle={t("metaSubtitle", { schema: twin.schemaVersion, twin: twin.twinVersion, updated: new Date(twin.lastUpdatedAt).toLocaleString() })}
      />
      <Box mt="xl">
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
          <SectionPanel title={t("dimensionsTitle")}>
            <Stack gap="md">
              {dimensions.map((d) => (
                <Paper key={d.label} withBorder p="md">
                  <Group justify="space-between" mb="xs">
                    <Text fw={600}>{d.label}</Text>
                    <Text fw={700}>{d.value}%</Text>
                  </Group>
                  <Progress value={d.value} color={d.value >= 70 ? getProductColor("dashboard", "success") : d.value >= 50 ? getProductColor("dashboard", "warning") : getProductColor("dashboard", "risk")} size="md" radius="xl" />
                  <Text size="sm" c="dimmed" mt="xs">{t("sourcesLabel", { sources: (d.sources ?? []).join(", ") || t("sourcesNone") })}</Text>
                </Paper>
              ))}
            </Stack>
          </SectionPanel>
          <Stack gap="lg">
            <SectionPanel title={t("metadataTitle")}>
              <StateBlock
                variant="info"
                title={t("confidenceTitle", { confidence: twin.recovery?.confidence ?? "low" })}
                description={t("historyDescription", { count: twin.history?.length ?? 0, org: twin.organisationId })}
              />
            </SectionPanel>
            <SectionPanel title={t("syncedSourcesTitle")}>
              <Group gap="xs">
                {[...new Set(dimensions.flatMap((d) => d.sources ?? []))].map((s) => (
                  <StateBlock key={s} variant="info" title={s} />
                ))}
                {dimensions.every((d) => !(d.sources ?? []).length) && (
                  <Text size="sm" c="dimmed">{t("syncedSourcesEmpty")}</Text>
                )}
              </Group>
            </SectionPanel>
          </Stack>
        </SimpleGrid>
      </Box>
    </Box>
  );
}
