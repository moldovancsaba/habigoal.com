"use client";

import { Text } from "@mantine/core";
import { Button, Group, Select, SimpleGrid, Stack } from "@doneisbetter/gds/client";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { LongitudinalChart } from "@/components/analytics/LongitudinalChart";
import { athleteIqRequest, type AthleteIqClientResult } from "@/lib/athleteiq-client";
import type { DailyIqPublicSnapshot } from "@/types/athleteiq-daily-iq";
import { getProductColor } from "@/lib/product-ui-contracts";

type HistoryResponse = { snapshots: DailyIqPublicSnapshot[]; from: string; to: string; count: number };
type TrendMetric = "dailyIqScore" | "readinessScore" | "habitScore" | "mentalEdgeScore";

const WINDOW_DAYS = 30;

export function AiqProgressPanel({ athleteId, localDate, timezone }: { athleteId: string; localDate: string; timezone: string }) {
  const t = useTranslations("ProductSurfaces.athleteIq.athleteWorkspace.panels");
  const [snapshots, setSnapshots] = useState<DailyIqPublicSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [metric, setMetric] = useState<TrendMetric>("dailyIqScore");

  const fetchHistory = useCallback(
    () => {
      const params = new URLSearchParams({ athleteId, from: shiftDate(localDate, -WINDOW_DAYS), to: localDate, timezone });
      return athleteIqRequest<HistoryResponse>(`/api/athleteiq/daily-iq/history?${params.toString()}`);
    },
    [athleteId, localDate, timezone]
  );

  const apply = useCallback((result: AthleteIqClientResult<HistoryResponse>) => {
    if (result.ok) {
      setSnapshots(result.data.snapshots);
      setError(false);
    } else {
      setError(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;
    fetchHistory().then((result) => {
      if (active) apply(result);
    });
    return () => {
      active = false;
    };
  }, [fetchHistory, apply]);

  function reload() {
    setLoading(true);
    setError(false);
    void fetchHistory().then(apply);
  }

  const series = useMemo(
    () =>
      snapshots
        .slice()
        .sort((a, b) => a.localDate.localeCompare(b.localDate))
        .map((snapshot) => ({ date: snapshot.localDate, value: snapshot[metric] }))
        .filter((point): point is { date: string; value: number } => typeof point.value === "number"),
    [snapshots, metric]
  );

  const latest = series[series.length - 1]?.value ?? null;
  const baseline = series[0]?.value ?? null;
  const average = series.length ? Math.round(series.reduce((sum, point) => sum + point.value, 0) / series.length) : null;
  const change = latest !== null && baseline !== null ? latest - baseline : null;

  const metricOptions = useMemo(
    () => [
      { value: "dailyIqScore", label: t("progress.metric.dailyIq") },
      { value: "readinessScore", label: t("progress.metric.readiness") },
      { value: "habitScore", label: t("progress.metric.habit") },
      { value: "mentalEdgeScore", label: t("progress.metric.mental") }
    ],
    [t]
  );

  if (loading) return <Text className="aiq-muted">{t("common.loading")}</Text>;

  if (error) {
    return (
      <Stack gap="sm">
        <Text className="aiq-muted">{t("common.loadError")}</Text>
        <Button variant="light" color={getProductColor("athlete_iq", "primaryAction")} size="sm" onClick={reload}>
          {t("common.retry")}
        </Button>
      </Stack>
    );
  }

  return (
    <Stack gap="md">
      <Select
        value={metric}
        onChange={(value) => {
          if (value === "dailyIqScore" || value === "readinessScore" || value === "habitScore" || value === "mentalEdgeScore") {
            setMetric(value);
          }
        }}
        data={metricOptions}
        allowDeselect={false}
        w="100%"
      />

      <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm">
        <Stat label={t("progress.latest")} value={formatStat(latest)} />
        <Stat label={t("progress.average")} value={formatStat(average)} />
        <Stat label={t("progress.change")} value={formatDelta(change)} />
        <Stat label={t("progress.points")} value={String(series.length)} />
      </SimpleGrid>

      {series.length === 0 ? (
        <Text className="aiq-muted">{t("progress.empty")}</Text>
      ) : (
        <LongitudinalChart title={t(`progress.metric.${metricLabelKey(metric)}`)} data={series} color="var(--mantine-color-review-6)" yDomain={[0, 100]} />
      )}
    </Stack>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Group className="aiq-row-card" gap={2} style={{ flexDirection: "column", alignItems: "flex-start" }}>
      <Text size="sm" tt="uppercase" className="aiq-muted-soft" fw={800}>{label}</Text>
      <Text fw={900}>{value}</Text>
    </Group>
  );
}

function metricLabelKey(metric: TrendMetric): string {
  return metric === "dailyIqScore" ? "dailyIq" : metric === "readinessScore" ? "readiness" : metric === "habitScore" ? "habit" : "mental";
}

function formatStat(value: number | null): string {
  return value === null ? "-" : String(value);
}

function formatDelta(value: number | null): string {
  if (value === null) return "-";
  // Round to 1 decimal so a latest-minus-baseline subtraction can't surface a
  // floating-point artifact (e.g. 5.7999999999999997 → 5.8).
  const rounded = Math.round(value * 10) / 10;
  return rounded > 0 ? `+${rounded}` : String(rounded);
}

function shiftDate(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
