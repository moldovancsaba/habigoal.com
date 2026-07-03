"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Box, Stack, Text, Paper, Slider, Group, NumberInput } from "@mantine/core";
import { PageHeader, SectionPanel, SemanticButton } from "@sovereignsquad/gds/client";

export default function RpeLoggerPage() {
  const t = useTranslations("Dashboard");
  const [rpe, setRpe] = useState<number>(5);
  const [duration, setDuration] = useState<number | string>(60);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    setSaving(true);
    // Real implementation would POST to /api/session-plans/rpe
    setTimeout(() => {
      setSaving(false);
      setSuccess(true);
    }, 1000);
  };

  if (success) {
    return (
      <Box p="xl" style={{ textAlign: "center" }}>
        <Text size="xl" fw={700} c="var(--mantine-color-tactical-6)">{t("trainingLogSuccessTitle")}</Text>
        <Text mt="sm">{t("trainingLogSuccessBody")}</Text>
      </Box>
    );
  }

  return (
    <Stack gap="md" p="md">
      <PageHeader title={t("trainingLogTitle")} />

      <SectionPanel title={t("trainingLogRpePanel")}>
        <Stack gap="xl">
          <Box>
            <Text fw={500} mb="xs">{t("trainingLogRpeLabel")}</Text>
            <Text size="sm" c="dimmed" mb="md">{t("trainingLogRpeHint")}</Text>
            <Slider
              value={rpe}
              onChange={setRpe}
              min={1}
              max={10}
              step={1}
              marks={[
                { value: 1, label: t("trainingLogMarkLight") },
                { value: 5, label: t("trainingLogMarkHard") },
                { value: 10, label: t("trainingLogMarkMaximal") }
              ]}
              mb="xl"
            />
          </Box>

          <NumberInput
            label={t("trainingLogDurationLabel")}
            value={duration}
            onChange={setDuration}
            min={1}
            max={300}
          />

          <Paper withBorder p="md" bg="gray.0">
            <Group justify="space-between">
              <Text fw={500}>{t("trainingLogCalculatedLoad")}</Text>
              <Text fw={700} size="lg" c="var(--mantine-color-ingress-7)">{t("trainingLogPoints", { points: rpe * Number(duration) })}</Text>
            </Group>
          </Paper>

          <SemanticButton action="save" color="ingress" onClick={handleSubmit} loading={saving} fullWidth />
        </Stack>
      </SectionPanel>
    </Stack>
  );
}
