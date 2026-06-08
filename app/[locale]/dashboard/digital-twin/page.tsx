"use client";

import React, { useEffect, useState } from "react";
import { PageHeader, SectionPanel, StateBlock } from "@doneisbetter/gds/client";
import { SimpleGrid, Box, Stack, Group, Text, Progress, Paper, Loader } from "@mantine/core";
import type { AthleteTwin } from "@/types/athlete-twin";

function dimScore(value?: number): number {
  if (value == null || Number.isNaN(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

export default function DigitalTwinDashboard() {
  const [twin, setTwin] = useState<AthleteTwin | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then(async (me) => {
        const athleteId = me?.athleteId ?? me?.user?.athleteId;
        if (!athleteId) {
          setError("No athlete linked to this account.");
          setLoading(false);
          return;
        }
        const res = await fetch(`/api/athletes/${athleteId}/twin`);
        if (!res.ok) throw new Error("Twin not found");
        setTwin(await res.json());
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load twin"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Box p="xl"><Loader /></Box>;
  if (error || !twin) {
    return (
      <Box p="xl">
        <StateBlock variant="info" title="Digital Twin" description={error ?? "No twin data yet. Complete a daily check-in to initialise."} />
      </Box>
    );
  }

  const dimensions = [
    { label: "Physical Capacity", value: dimScore(twin.physical?.restingHeartRateBpm ? 100 - twin.physical.restingHeartRateBpm : undefined), sources: twin.physical?.sources },
    { label: "Performance State", value: dimScore(twin.recovery?.recoveryReadinessScore), sources: twin.performance?.sources },
    { label: "Technical Execution", value: dimScore(twin.technical?.movementSymmetryIndex ? twin.technical.movementSymmetryIndex * 100 : undefined), sources: twin.technical?.sources },
    { label: "Recovery & Sleep", value: dimScore(twin.recovery?.sleepQualityScore7d), sources: twin.recovery?.sources },
    { label: "Cognitive Load", value: dimScore(twin.cognitive?.moodTrend7d ? twin.cognitive.moodTrend7d * 10 : undefined), sources: twin.cognitive?.sources },
  ];

  return (
    <Box className="digital-twin-dashboard" pb="xl">
      <PageHeader
        title="Unified Digital Twin"
        subtitle={`Schema v${twin.schemaVersion} • Twin v${twin.twinVersion} • Updated ${new Date(twin.lastUpdatedAt).toLocaleString()}`}
      />
      <Box mt="xl">
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
          <SectionPanel title="5-Dimension Status">
            <Stack gap="md">
              {dimensions.map((d) => (
                <Paper key={d.label} withBorder p="md">
                  <Group justify="space-between" mb="xs">
                    <Text fw={600}>{d.label}</Text>
                    <Text fw={700}>{d.value}%</Text>
                  </Group>
                  <Progress value={d.value} color={d.value >= 70 ? "green" : d.value >= 50 ? "yellow" : "red"} size="md" radius="xl" />
                  <Text size="sm" c="dimmed" mt="xs">Sources: {(d.sources ?? []).join(", ") || "none"}</Text>
                </Paper>
              ))}
            </Stack>
          </SectionPanel>
          <Stack gap="lg">
            <SectionPanel title="Twin Metadata">
              <StateBlock
                variant="info"
                title={`Confidence: ${twin.recovery?.confidence ?? "low"}`}
                description={`History entries: ${twin.history?.length ?? 0}. Organisation: ${twin.organisationId}.`}
              />
            </SectionPanel>
            <SectionPanel title="Synced Sources">
              <Group gap="xs">
                {[...new Set(dimensions.flatMap((d) => d.sources ?? []))].map((s) => (
                  <StateBlock key={s} variant="info" title={s} />
                ))}
                {dimensions.every((d) => !(d.sources ?? []).length) && (
                  <Text size="sm" c="dimmed">Complete check-in or connect a wearable to populate sources.</Text>
                )}
              </Group>
            </SectionPanel>
          </Stack>
        </SimpleGrid>
      </Box>
    </Box>
  );
}
