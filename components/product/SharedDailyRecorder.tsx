"use client";

import { useRouter } from "next/navigation";
import { Alert, Text } from "@mantine/core";
import { Box, Checkbox, GdsIcons, Group, Progress, SemanticButton, SimpleGrid, Slider, Stack } from "@sovereignsquad/gds/client";
import { useCallback, useEffect, useState } from "react";
import type { HabigoalHabitKey } from "@/services/habigoal-product.service";
import type { SharedDailyProduct, SharedDailyStateProjection } from "@/services/shared-daily-state.service";
import type { ProductSurfaceActionPack } from "./productSurfaceActions";
import { getProductColor, scoreToProgressIntent, type ProductSurfaceKey } from "@/lib/product-ui-contracts";

type DailyMetricKey = keyof SharedDailyStateProjection["checkIn"];
type DailyMetricValues = SharedDailyStateProjection["checkIn"];
type RecorderFeedback = {
  correlationId?: string;
  kind: "error" | "success";
  message: string;
  title: string;
};

export type SharedDailyRecorderLabels = {
  checkIn: Record<DailyMetricKey, string> & {
    completeAll: string;
    unset: string;
  };
  errors: {
    loadFailed: string;
    profileRequired: string;
    saveFailed: string;
    sessionExpired: string;
    title: string;
  };
  habits: {
    categories: Record<HabitItem["category"], string>;
    completion: string;
    confirmRequired: string;
    copy: string;
    itemLabel: string;
    items: Record<HabigoalHabitKey, string>;
    reviewed: string;
    title: string;
  };
  reference: string;
  saved: string;
  savedTitle: string;
};

type HabitItem = {
  category: "fuel" | "life" | "mental" | "recovery" | "sport";
  id: HabigoalHabitKey;
};

const EMPTY_VALUES: DailyMetricValues = {
  energy: null,
  mood: null,
  sleep: null,
  soreness: null
};

const DAILY_HABITS = [
  { id: "hydrate", category: "recovery" },
  { id: "move", category: "sport" },
  { id: "fuel", category: "fuel" },
  { id: "reflect", category: "mental" },
  { id: "sleep", category: "recovery" },
  { id: "study", category: "life" }
] satisfies HabitItem[];

export function SharedDailyRecorder({
  actionPack,
  athleteId,
  labels,
  localDate,
  product,
  timezone,
  variant = "aiq"
}: {
  actionPack: ProductSurfaceActionPack;
  athleteId: string | null;
  labels: SharedDailyRecorderLabels;
  localDate: string;
  product: SharedDailyProduct;
  timezone: string;
  variant?: "aiq" | "habigoal";
}) {
  const router = useRouter();
  const [projection, setProjection] = useState<SharedDailyStateProjection | null>(null);
  const [draftValues, setDraftValues] = useState<DailyMetricValues>(EMPTY_VALUES);
  const [selectedHabits, setSelectedHabits] = useState<HabigoalHabitKey[]>([]);
  const [habitsReviewed, setHabitsReviewed] = useState(false);
  const [feedback, setFeedback] = useState<RecorderFeedback | null>(null);
  const [saving, setSaving] = useState(false);

  const applyProjection = useCallback((nextProjection: SharedDailyStateProjection) => {
    setProjection(nextProjection);
    setDraftValues(nextProjection.checkIn);
    setSelectedHabits(nextProjection.habits.completed);
    setHabitsReviewed(nextProjection.habits.recorded);
  }, []);

  useEffect(() => {
    if (!athleteId) {
      return;
    }

    const controller = new AbortController();
    const params = new URLSearchParams({
      athleteId,
      date: localDate,
      product,
      timezone
    });

    fetch(`/api/daily-state?${params.toString()}`, { signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json().catch(() => null) as null | { correlationId?: string; projection?: SharedDailyStateProjection };
        if (!response.ok || !payload?.projection) {
          setFeedback({
            correlationId: payload?.correlationId,
            kind: "error",
            message: labels.errors.loadFailed,
            title: labels.errors.title
          });
          return;
        }
        applyProjection(payload.projection);
      })
      .catch((error) => {
        if ((error as Error).name !== "AbortError") {
          setFeedback({ kind: "error", message: labels.errors.loadFailed, title: labels.errors.title });
        }
      });

    return () => controller.abort();
  }, [applyProjection, athleteId, labels.errors.loadFailed, labels.errors.title, localDate, product, timezone]);

  const habitScore = Math.round((selectedHabits.length / DAILY_HABITS.length) * 100);
  const hasCompleteDraft = Object.values(draftValues).every((value) => typeof value === "number" && Number.isFinite(value));
  const hasRecordedHabits = habitsReviewed || Boolean(projection?.habits.recorded);
  const canSave = Boolean(athleteId) && hasCompleteDraft && hasRecordedHabits && !saving;
  const shellClass = variant === "aiq" ? "shared-daily-recorder shared-daily-recorder-aiq" : "shared-daily-recorder shared-daily-recorder-habigoal";
  const surfaceKey = surfaceKeyForVariant(variant);
  const statusScore = projection?.status.score;

  function setMetric(key: DailyMetricKey, value: number) {
    setDraftValues((current) => ({ ...current, [key]: value }));
    setFeedback(null);
  }

  function toggleHabit(id: HabigoalHabitKey, checked: boolean) {
    setSelectedHabits((current) => checked ? [...new Set([...current, id])] : current.filter((item) => item !== id));
    setHabitsReviewed(true);
    setFeedback(null);
  }

  function resetValues() {
    applyProjection(projection ?? {
      athleteId: athleteId ?? "",
      athleteName: null,
      checkIn: EMPTY_VALUES,
      dataFreshness: { generatedAt: new Date().toISOString(), sourceCollections: [] },
      habits: { completed: [], recorded: false, total: DAILY_HABITS.length },
      localDate,
      product,
      status: {
        confidence: "none",
        missingSignals: [],
        nextActionKey: "needs_input",
        reasonCodes: [],
        score: null,
        status: "needs_input"
      },
      timezone,
      version: "shared-daily-state-v1"
    });
    setFeedback(null);
  }

  async function saveDailyState() {
    if (!athleteId) {
      setFeedback({ kind: "error", message: labels.errors.profileRequired, title: labels.errors.title });
      return;
    }
    if (!hasCompleteDraft) {
      setFeedback({ kind: "error", message: labels.checkIn.completeAll, title: labels.errors.title });
      return;
    }
    if (!hasRecordedHabits) {
      setFeedback({ kind: "error", message: labels.habits.confirmRequired, title: labels.errors.title });
      return;
    }

    setSaving(true);
    setFeedback(null);
    try {
      const response = await fetch("/api/daily-state", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          athleteId,
          habits: selectedHabits,
          idempotencyKey: `${product}:${athleteId}:${localDate}:daily-recorder`,
          localDate,
          product,
          timezone,
          values: draftValues
        })
      });
      const payload = await response.json().catch(() => null) as null | {
        code?: string;
        correlationId?: string;
        ok?: boolean;
        projection?: SharedDailyStateProjection;
      };

      if (!response.ok || !payload?.ok || !payload.projection) {
        setFeedback({
          correlationId: payload?.correlationId,
          kind: "error",
          message: errorMessageForCode(payload?.code, labels),
          title: labels.errors.title
        });
        return;
      }

      applyProjection(payload.projection);
      setFeedback({ correlationId: payload.correlationId, kind: "success", message: labels.saved, title: labels.savedTitle });
      router.refresh();
    } catch {
      setFeedback({ kind: "error", message: labels.errors.saveFailed, title: labels.errors.title });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Stack gap="md" className={shellClass}>
      {feedback ? (
        <Alert color={getProductColor(surfaceKey, feedback.kind === "success" ? "success" : "risk")} title={feedback.title} role={feedback.kind === "success" ? "status" : "alert"}>
          <Stack gap={4}>
            <Text>{feedback.message}</Text>
            {feedback.correlationId ? <Text size="sm">{labels.reference.replace("{correlationId}", feedback.correlationId)}</Text> : null}
          </Stack>
        </Alert>
      ) : null}

      <Stack gap="md">
        <DailyMetricSlider label={labels.checkIn.energy} unsetLabel={labels.checkIn.unset} value={draftValues.energy} variant={variant} onChange={(value) => setMetric("energy", value)} />
        <DailyMetricSlider label={labels.checkIn.mood} unsetLabel={labels.checkIn.unset} value={draftValues.mood} variant={variant} onChange={(value) => setMetric("mood", value)} />
        <DailyMetricSlider label={labels.checkIn.sleep} unsetLabel={labels.checkIn.unset} value={draftValues.sleep} variant={variant} onChange={(value) => setMetric("sleep", value)} />
        <DailyMetricSlider label={labels.checkIn.soreness} unsetLabel={labels.checkIn.unset} value={draftValues.soreness} variant={variant} onChange={(value) => setMetric("soreness", value)} />
        {!hasCompleteDraft ? <Text size="sm" className={variant === "aiq" ? "aiq-muted" : "hbg-muted-text"}>{labels.checkIn.completeAll}</Text> : null}
      </Stack>

      <Box className={variant === "aiq" ? "aiq-recorder-habits" : "hbg-recorder-habits"}>
        <Stack gap="md">
          <Group gap="xs" wrap="nowrap">
            <GdsIcons.Habit size={18} aria-hidden="true" />
            <Stack gap={0}>
              <Text fw={900}>{labels.habits.title}</Text>
              <Text size="sm" className={variant === "aiq" ? "aiq-muted" : "hbg-muted-text"}>{labels.habits.copy}</Text>
            </Stack>
          </Group>
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
            {DAILY_HABITS.map((habit) => (
              <Checkbox
                key={habit.id}
                checked={selectedHabits.includes(habit.id)}
                className={variant === "aiq" ? "aiq-recorder-checkbox" : "hbg-checkbox"}
                label={labels.habits.itemLabel
                  .replace("{label}", labels.habits.items[habit.id])
                  .replace("{category}", labels.habits.categories[habit.category])}
                onChange={(event) => toggleHabit(habit.id, event.currentTarget.checked)}
              />
            ))}
          </SimpleGrid>
          <Checkbox
            checked={habitsReviewed}
            className={variant === "aiq" ? "aiq-recorder-checkbox" : "hbg-checkbox"}
            label={labels.habits.reviewed}
            onChange={(event) => {
              setHabitsReviewed(event.currentTarget.checked);
              setFeedback(null);
            }}
          />
          <Box>
            <Group justify="space-between" mb={6}>
              <Text fw={800}>{labels.habits.completion}</Text>
              <Text fw={800}>{habitScore}%</Text>
            </Group>
            <Progress value={habitScore} color={getProductColor(surfaceKey, scoreToProgressIntent(habitScore))} radius="xl" size="lg" />
          </Box>
        </Stack>
      </Box>

      <Group gap="sm" wrap="wrap">
        <SemanticButton action="productSurface:reset" variant="default" vocabularyPacks={[actionPack]} onClick={resetValues} disabled={saving} />
        <SemanticButton action="productSurface:complete" color={getProductColor(surfaceKey, "primaryAction")} vocabularyPacks={[actionPack]} onClick={saveDailyState} disabled={!canSave} loading={saving} />
      </Group>
      {!hasRecordedHabits ? <Text size="sm" className={variant === "aiq" ? "aiq-muted" : "hbg-muted-text"}>{labels.habits.confirmRequired}</Text> : null}
      {typeof statusScore === "number" ? <Text size="sm" className={variant === "aiq" ? "aiq-muted-faint" : "hbg-muted-text"}>{labels.saved}</Text> : null}
    </Stack>
  );
}

function DailyMetricSlider({
  label,
  onChange,
  unsetLabel,
  value,
  variant
}: {
  label: string;
  onChange: (value: number) => void;
  unsetLabel: string;
  value: number | null;
  variant: "aiq" | "habigoal";
}) {
  const sliderValue = value ?? 50;
  const surfaceKey = surfaceKeyForVariant(variant);
  return (
    <Stack gap={6} className={variant === "aiq" ? "aiq-recorder-slider" : undefined}>
      <Group justify="space-between">
        <Text fw={800}>{label}</Text>
        <Text fw={800}>{value === null ? unsetLabel : `${value}%`}</Text>
      </Group>
      <Slider
        aria-label={label}
        color={getProductColor(surfaceKey, "primaryAction")}
        label={(current) => `${current}%`}
        max={100}
        min={0}
        onChange={onChange}
        step={1}
        value={sliderValue}
      />
    </Stack>
  );
}

function errorMessageForCode(code: string | undefined, labels: SharedDailyRecorderLabels) {
  if (code === "AUTH_REQUIRED") return labels.errors.sessionExpired;
  if (code === "FORBIDDEN" || code === "PRODUCT_ACCESS_DENIED") return labels.errors.profileRequired;
  return labels.errors.saveFailed;
}

function surfaceKeyForVariant(variant: "aiq" | "habigoal"): ProductSurfaceKey {
  return variant === "aiq" ? "athlete_iq" : "habigoal";
}
