"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Box, Group, NumberInput, PageHeader, SectionPanel, SemanticButton, Slider, Stack } from "@sovereignsquad/gds/client";
import { Paper, Text } from "@/components/gds/SurfacePrimitives";
import { getProductColor } from "@/lib/product-ui-contracts";

type TrainingLoadLoggerProps = {
  athleteId: string;
};

type TrainingLoadResponse = {
  error?: string;
  loadPoints?: number;
};

export function TrainingLoadLogger({ athleteId }: TrainingLoadLoggerProps) {
  const t = useTranslations("Dashboard");
  const tc = useTranslations("Common");
  const [rpe, setRpe] = useState<number>(5);
  const [duration, setDuration] = useState<number | string>(60);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedLoadPoints, setSavedLoadPoints] = useState<number | null>(null);
  const durationMinutes = normalizeDuration(duration);
  const computedLoadPoints = useMemo(
    () => durationMinutes === null ? null : Math.round(rpe * durationMinutes),
    [durationMinutes, rpe]
  );
  const canSave = durationMinutes !== null && !saving;

  async function handleSubmit() {
    if (durationMinutes === null) return;

    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/athletes/${athleteId}/training-load`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activityTypes: ["training"],
          date: localIsoDate(),
          durationMinutes,
          rpe,
          source: "athlete"
        })
      });
      const payload = await response.json().catch(() => null) as TrainingLoadResponse | null;
      if (!response.ok) {
        throw new Error(payload?.error || tc("error"));
      }
      setSavedLoadPoints(typeof payload?.loadPoints === "number" ? payload.loadPoints : computedLoadPoints);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : tc("error"));
    } finally {
      setSaving(false);
    }
  }

  if (savedLoadPoints !== null) {
    return (
      <Box p="xl" style={{ textAlign: "center" }}>
        <Text size="xl" fw={700} c="var(--mantine-color-tactical-6)">{t("trainingLogSuccessTitle")}</Text>
        <Text mt="sm">{t("trainingLogSuccessBody")}</Text>
        <Text mt="sm" c="var(--gds-vibe-accent, var(--accent-gold))" fw={700}>
          {t("trainingLogPoints", { points: savedLoadPoints })}
        </Text>
      </Box>
    );
  }

  return (
    <Stack gap="md" p="md">
      <PageHeader title={t("trainingLogTitle")} />

      <SectionPanel title={t("trainingLogRpePanel")}>
        <Stack gap="xl">
          <Box>
            <Text fw={500} id="training-log-rpe-label" mb="xs">{t("trainingLogRpeLabel")}</Text>
            <Text size="sm" c="dimmed" mb="md">{t("trainingLogRpeHint")}</Text>
            <Slider
              aria-labelledby="training-log-rpe-label"
              value={rpe}
              onChange={setRpe}
              min={1}
              max={10}
              step={1}
              color={getProductColor("dashboard", "primaryAction")}
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

          <Paper withBorder p="md" className="glass-panel surface-outline">
            <Group justify="space-between">
              <Text fw={500}>{t("trainingLogCalculatedLoad")}</Text>
              <Text fw={700} size="lg" c="var(--gds-vibe-accent, var(--accent-gold))">
                {t("trainingLogPoints", { points: computedLoadPoints ?? 0 })}
              </Text>
            </Group>
          </Paper>

          {error ? (
            <Text c="var(--mantine-color-red-6)" role="alert" size="sm">
              {error}
            </Text>
          ) : null}

          <SemanticButton
            action="save"
            color={getProductColor("dashboard", "primaryAction")}
            disabled={!canSave}
            onClick={() => void handleSubmit()}
            loading={saving}
            fullWidth
          />
        </Stack>
      </SectionPanel>
    </Stack>
  );
}

function normalizeDuration(value: number | string) {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return null;
  const rounded = Math.round(numeric);
  return rounded >= 1 && rounded <= 300 ? rounded : null;
}

function localIsoDate() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
