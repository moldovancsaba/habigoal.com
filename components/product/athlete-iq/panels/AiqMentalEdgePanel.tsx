"use client";

import { Badge, Box, Button, Group, Stack } from "@sovereignsquad/gds/client";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { athleteIqJsonInit, athleteIqRequest, type AthleteIqClientResult } from "@/lib/athleteiq-client";
import type { MentalEdgeRoutine, MentalEdgeSnapshot } from "@/types/athleteiq-mental-edge";
import { useAthleteIqDomainCopy } from "../useAthleteIqDomainCopy";
import { getProductColor } from "@/lib/product-ui-contracts";
import { Text } from "@/components/gds/SurfacePrimitives";

type MentalEdgeTodayResponse = { snapshot: MentalEdgeSnapshot };

const RISK_COLOR: Record<MentalEdgeSnapshot["riskLevel"], string> = {
  stable: getProductColor("athlete_iq", "success"),
  watch: getProductColor("athlete_iq", "warning"),
  concern: getProductColor("athlete_iq", "warning"),
  urgent: getProductColor("athlete_iq", "risk"),
  insufficient: getProductColor("athlete_iq", "neutral")
};

export function AiqMentalEdgePanel({ athleteId, localDate, timezone }: { athleteId: string; localDate: string; timezone: string }) {
  const t = useTranslations("ProductSurfaces.athleteIq.athleteWorkspace.panels");
  const domain = useAthleteIqDomainCopy();
  const [snapshot, setSnapshot] = useState<MentalEdgeSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const fetchSnapshot = useCallback(
    () => {
      const params = new URLSearchParams({ athleteId, localDate, timezone });
      return athleteIqRequest<MentalEdgeTodayResponse>(`/api/athleteiq/mental-edge/today?${params.toString()}`);
    },
    [athleteId, localDate, timezone]
  );

  const apply = useCallback((result: AthleteIqClientResult<MentalEdgeTodayResponse>) => {
    if (result.ok) {
      setSnapshot(result.data.snapshot);
      setError(false);
    } else {
      setError(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;
    fetchSnapshot().then((result) => {
      if (active) apply(result);
    });
    return () => {
      active = false;
    };
  }, [fetchSnapshot, apply]);

  function reload() {
    setLoading(true);
    setError(false);
    void fetchSnapshot().then(apply);
  }

  async function completeRoutine(routine: MentalEdgeRoutine) {
    setBusy(routine.routineId);
    const result = await athleteIqRequest(
      `/api/athleteiq/mental-edge/routines/${encodeURIComponent(routine.routineId)}/complete`,
      athleteIqJsonInit({ athleteId, localDate, timezone })
    );
    if (result.ok) {
      setSnapshot((current) =>
        current
          ? { ...current, routines: current.routines.map((entry) => (entry.routineId === routine.routineId ? { ...entry, completed: true } : entry)) }
          : current
      );
    } else {
      setError(true);
    }
    setBusy(null);
  }

  if (loading) return <Text className="aiq-muted">{t("common.loading")}</Text>;

  if (!snapshot) {
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
      <Box className="aiq-row-card">
        <Group justify="space-between" gap="sm">
          <Stack gap={2}>
            <Text fw={900}>{snapshot.score === null ? t("common.noData") : snapshot.score}</Text>
            <Text size="sm" className="aiq-muted-soft">{t(`mentalEdge.trend.${snapshot.trend}`)}</Text>
          </Stack>
          <Badge color={RISK_COLOR[snapshot.riskLevel]} variant="light">{t(`mentalEdge.risk.${snapshot.riskLevel}`)}</Badge>
        </Group>
      </Box>

      {error ? <Text size="sm" className="aiq-muted" style={{ color: "var(--status-error)" }}>{t("common.actionFailed")}</Text> : null}

      <Text size="sm" className="aiq-muted-soft">{t("mentalEdge.routinesTitle")}</Text>
      {snapshot.routines.length === 0 ? <Text className="aiq-muted">{t("mentalEdge.noRoutines")}</Text> : null}
      {snapshot.routines.map((routine) => (
        <Box key={routine.routineId} className={routine.completed ? "aiq-row-card aiq-row-card-muted" : "aiq-row-card"}>
          <Stack gap="xs">
            <Group justify="space-between" align="flex-start" gap="sm">
              <Text fw={800}>{domain(routine.labelKey)}</Text>
              <Badge color={routine.completed ? getProductColor("athlete_iq", "success") : getProductColor("athlete_iq", "neutral")} variant="light">
                {routine.completed ? t("mentalEdge.completed") : t("mentalEdge.minutes", { minutes: routine.estimatedMinutes })}
              </Badge>
            </Group>
            <Text size="sm" className="aiq-muted-faint">{domain(`athleteiq.mentalEdge.reasons.${routine.reasonCode}`)}</Text>
            <Button
              color={getProductColor("athlete_iq", "primaryAction")}
              size="sm"
              variant="light"
              disabled={routine.completed || busy === routine.routineId}
              loading={busy === routine.routineId}
              onClick={() => void completeRoutine(routine)}
            >
              {routine.completed ? t("mentalEdge.completed") : t("mentalEdge.markComplete")}
            </Button>
          </Stack>
        </Box>
      ))}
    </Stack>
  );
}
