"use client";

import { Badge, Box, Group, NumberInput, SegmentedControl, Select, Stack, Text, TextInput } from "@mantine/core";
import { SemanticButton } from "@doneisbetter/gds/client";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { athleteIqJsonInit, athleteIqRequest, type AthleteIqClientResult } from "@/lib/athleteiq-client";
import type { CognitiveLiteJourney } from "@/types/athleteiq-cognitive";
import type { LiteModuleDailySummary, LiteModuleGatewaySummary } from "@/types/athleteiq-lite-modules";
import { useAthleteIqDomainCopy } from "../useAthleteIqDomainCopy";

type GatewayResponse = { summary: LiteModuleGatewaySummary | null };
type CognitiveResponse = { journey: CognitiveLiteJourney };

type EntryModule = "recovery" | "fuel" | "learning" | "wearable";
const FUEL_STATUSES = ["on_track", "late", "missed", "unknown"] as const;
const LEARNING_STATUSES = ["not_started", "in_progress", "completed", "skipped"] as const;
const WEARABLE_METRICS: Record<string, string> = {
  resting_heart_rate: "bpm",
  hrv_ms: "ms",
  sleep_hours: "h",
  steps: "steps",
  body_weight_kg: "kg",
  training_load_au: "au"
};

export function AiqLiteModulesPanel({ athleteId, localDate, timezone }: { athleteId: string; localDate: string; timezone: string }) {
  const t = useTranslations("ProductSurfaces.athleteIq.athleteWorkspace.panels");
  const domain = useAthleteIqDomainCopy();
  const [summary, setSummary] = useState<LiteModuleGatewaySummary | null>(null);
  const [cognitive, setCognitive] = useState<CognitiveLiteJourney | null>(null);
  const [loading, setLoading] = useState(true);
  const [entryModule, setEntryModule] = useState<EntryModule>("recovery");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<"saved" | "error" | null>(null);

  // Form drafts
  const [protocolKey, setProtocolKey] = useState("");
  const [perceivedRecovery, setPerceivedRecovery] = useState(3);
  const [mealTimingStatus, setMealTimingStatus] = useState<string>("on_track");
  const [hydrationStatus, setHydrationStatus] = useState<string>("on_track");
  const [fuelNote, setFuelNote] = useState("");
  const [itemId, setItemId] = useState("");
  const [learningStatus, setLearningStatus] = useState<string>("in_progress");
  const [metricKey, setMetricKey] = useState<string>("resting_heart_rate");
  const [metricValue, setMetricValue] = useState<number>(60);

  const fetchAll = useCallback(
    () => {
      const params = new URLSearchParams({ athleteId, localDate });
      return Promise.all([
        athleteIqRequest<GatewayResponse>(`/api/athleteiq/lite-modules?${params.toString()}`),
        athleteIqRequest<CognitiveResponse>(`/api/athleteiq/cognitive-lite/results?${new URLSearchParams({ athleteId }).toString()}`)
      ]);
    },
    [athleteId, localDate]
  );

  const apply = useCallback(([gateway, cog]: [AthleteIqClientResult<GatewayResponse>, AthleteIqClientResult<CognitiveResponse>]) => {
    if (gateway.ok) setSummary(gateway.data.summary);
    if (cog.ok) setCognitive(cog.data.journey);
    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;
    fetchAll().then((results) => {
      if (active) apply(results);
    });
    return () => {
      active = false;
    };
  }, [fetchAll, apply]);

  const moduleOptions = useMemo(
    () => [
      { value: "recovery", label: t("lite.modules.recovery") },
      { value: "fuel", label: t("lite.modules.fuel") },
      { value: "learning", label: t("lite.modules.learning") },
      { value: "wearable", label: t("lite.modules.wearable") }
    ],
    [t]
  );

  async function submit() {
    setBusy(true);
    setFeedback(null);
    const nowIso = new Date().toISOString();
    let endpoint = "";
    let payload: Record<string, unknown> = { athleteId, localDate, timezone };

    if (entryModule === "recovery") {
      endpoint = "/api/athleteiq/recovery-lite/entries";
      payload = { ...payload, protocolKey: protocolKey.trim(), perceivedRecovery, completedAt: nowIso };
    } else if (entryModule === "fuel") {
      endpoint = "/api/athleteiq/fuel-lite/entries";
      payload = { ...payload, mealTimingStatus, hydrationStatus, note: fuelNote.trim() || undefined };
    } else if (entryModule === "learning") {
      endpoint = "/api/athleteiq/learning/progress";
      payload = { ...payload, itemId: itemId.trim(), status: learningStatus, ...(learningStatus === "completed" ? { completedAt: nowIso } : {}) };
    } else {
      endpoint = "/api/athleteiq/wearables/manual-entry";
      payload = { ...payload, metricKey, value: metricValue, unit: WEARABLE_METRICS[metricKey], measuredAt: nowIso };
    }

    const result = await athleteIqRequest(endpoint, athleteIqJsonInit(payload));
    if (result.ok) {
      setFeedback("saved");
      setProtocolKey("");
      setFuelNote("");
      setItemId("");
      apply(await fetchAll());
    } else {
      setFeedback("error");
    }
    setBusy(false);
  }

  const submitDisabled =
    busy ||
    (entryModule === "recovery" && !protocolKey.trim()) ||
    (entryModule === "learning" && !itemId.trim());

  return (
    <Stack gap="md">
      {loading ? <Text className="aiq-muted">{t("common.loading")}</Text> : null}

      {summary ? (
        <SimpleSummary summaries={summary.summaries} domain={domain} t={t} />
      ) : null}

      <Box className="aiq-row-card">
        <Stack gap="sm">
          <SegmentedControl value={entryModule} onChange={(value) => setEntryModule(value as EntryModule)} data={moduleOptions} fullWidth />

          {entryModule === "recovery" ? (
            <Group grow align="flex-end">
              <TextInput label={t("lite.protocol")} value={protocolKey} onChange={(event) => setProtocolKey(event.currentTarget.value)} placeholder={t("lite.protocolPlaceholder")} />
              <NumberInput label={t("lite.perceivedRecovery")} value={perceivedRecovery} min={1} max={5} onChange={(value) => setPerceivedRecovery(clampNumber(value, 1, 5, 3))} />
            </Group>
          ) : null}

          {entryModule === "fuel" ? (
            <Stack gap="sm">
              <Group grow>
                <Select label={t("lite.mealTiming")} data={FUEL_STATUSES.map((value) => ({ value, label: t(`lite.fuelStatus.${value}`) }))} value={mealTimingStatus} onChange={(value) => setMealTimingStatus(value ?? "on_track")} allowDeselect={false} />
                <Select label={t("lite.hydration")} data={FUEL_STATUSES.map((value) => ({ value, label: t(`lite.fuelStatus.${value}`) }))} value={hydrationStatus} onChange={(value) => setHydrationStatus(value ?? "on_track")} allowDeselect={false} />
              </Group>
              <TextInput label={t("lite.note")} value={fuelNote} onChange={(event) => setFuelNote(event.currentTarget.value)} maxLength={500} />
            </Stack>
          ) : null}

          {entryModule === "learning" ? (
            <Group grow align="flex-end">
              <TextInput label={t("lite.itemId")} value={itemId} onChange={(event) => setItemId(event.currentTarget.value)} placeholder={t("lite.itemIdPlaceholder")} />
              <Select label={t("lite.learningStatus")} data={LEARNING_STATUSES.map((value) => ({ value, label: t(`lite.learningStatusOption.${value}`) }))} value={learningStatus} onChange={(value) => setLearningStatus(value ?? "in_progress")} allowDeselect={false} />
            </Group>
          ) : null}

          {entryModule === "wearable" ? (
            <Group grow align="flex-end">
              <Select label={t("lite.metric")} data={Object.keys(WEARABLE_METRICS).map((value) => ({ value, label: t(`lite.metricOption.${value}`) }))} value={metricKey} onChange={(value) => setMetricKey(value ?? "resting_heart_rate")} allowDeselect={false} />
              <NumberInput label={`${t("lite.value")} (${WEARABLE_METRICS[metricKey]})`} value={metricValue} onChange={(value) => setMetricValue(clampNumber(value, 0, 100000, 0))} />
            </Group>
          ) : null}

          {feedback === "saved" ? <Text size="sm" style={{ color: "var(--status-success)" }}>{t("lite.saved")}</Text> : null}
          {feedback === "error" ? <Text size="sm" style={{ color: "var(--status-error)" }}>{t("common.actionFailed")}</Text> : null}

          <Group justify="flex-end">
            <SemanticButton action="save" color="yellow" size="sm" loading={busy} disabled={submitDisabled} onClick={() => void submit()}>
              {t("lite.save")}
            </SemanticButton>
          </Group>
        </Stack>
      </Box>

      {cognitive ? <CognitiveSummary journey={cognitive} domain={domain} t={t} /> : null}
    </Stack>
  );
}

function SimpleSummary({
  summaries,
  domain,
  t
}: {
  summaries: LiteModuleDailySummary[];
  domain: (key: string) => string;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <Stack gap="xs">
      <Text size="sm" className="aiq-muted-soft">{t("lite.summaryTitle")}</Text>
      {summaries.map((entry) => (
        <Box key={entry.moduleKey} className="aiq-row-card">
          <Group justify="space-between" align="flex-start" gap="sm">
            <Stack gap={2}>
              <Text fw={800}>{domain(`athleteiq.modules.${liteDisplayKey(entry.moduleKey)}.name`)}</Text>
              <Text size="sm" className="aiq-muted-faint">{t("lite.entryCount", { count: entry.entryCount })}</Text>
            </Stack>
            <Badge color={entry.confidence === "medium" ? "tactical" : entry.confidence === "low" ? "yellow" : "gray"} variant="light">
              {t(`lite.confidence.${entry.confidence}`)}
            </Badge>
          </Group>
        </Box>
      ))}
    </Stack>
  );
}

function CognitiveSummary({
  journey,
  domain,
  t
}: {
  journey: CognitiveLiteJourney;
  domain: (key: string) => string;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <Stack gap="xs">
      <Text size="sm" className="aiq-muted-soft">{t("lite.cognitiveTitle")}</Text>
      <Box className="aiq-row-card">
        <Stack gap="xs">
          <Text size="sm" className="aiq-muted-faint">{t("lite.cognitiveProgress", { completed: journey.completedTraitCount, total: journey.totalTraitCount })}</Text>
          {journey.traitResults.map((trait) => (
            <Group key={trait.trait} justify="space-between" gap="sm">
              <Text size="sm">{domain(`athleteiq.cognitiveLite.trait.${trait.trait}`)}</Text>
              <Group gap="xs">
                <Text size="sm" fw={700}>{trait.score === null ? "-" : trait.score}</Text>
                <Badge size="sm" variant="light" color={trait.band === "strength" ? "tactical" : trait.band === "stable" ? "yellow" : trait.band === "watch" ? "orange" : "gray"}>
                  {t(`lite.cognitiveBand.${trait.band}`)}
                </Badge>
              </Group>
            </Group>
          ))}
        </Stack>
      </Box>
    </Stack>
  );
}

function liteDisplayKey(moduleKey: string): string {
  return (
    moduleKey === "recovery_lite" ? "recoveryLite" :
    moduleKey === "fuel_lite" ? "fuelLite" :
    moduleKey === "learning_lite" ? "learningLite" :
    moduleKey === "wearable_manual_sync" ? "wearableManualSync" :
    moduleKey
  );
}

function clampNumber(value: number | string, min: number, max: number, fallback: number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}
