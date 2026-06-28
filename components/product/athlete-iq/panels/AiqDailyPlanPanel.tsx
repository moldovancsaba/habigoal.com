"use client";

import { Badge, Box, Button, Group, Stack, Text } from "@mantine/core";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { athleteIqJsonInit, athleteIqRequest, type AthleteIqClientResult } from "@/lib/athleteiq-client";
import type { DailyPlan, DailyTask, DailyTaskCompletionState } from "@/types/athleteiq-daily-plan";
import { useAthleteIqDomainCopy } from "../useAthleteIqDomainCopy";

type DailyPlanTodayResponse = { plan: DailyPlan | null; empty: boolean };
type DailyPlanMutationResponse = { plan: DailyPlan };

const PRIORITY_COLOR: Record<DailyTask["priority"], string> = {
  critical: "red",
  high: "orange",
  medium: "yellow",
  low: "tactical"
};

export function AiqDailyPlanPanel({ athleteId, localDate, timezone }: { athleteId: string; localDate: string; timezone: string }) {
  const t = useTranslations("ProductSurfaces.athleteIq.athleteWorkspace.panels");
  const domain = useAthleteIqDomainCopy();
  const [plan, setPlan] = useState<DailyPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const fetchPlan = useCallback(
    () => {
      const params = new URLSearchParams({ athleteId, localDate, timezone });
      return athleteIqRequest<DailyPlanTodayResponse>(`/api/athleteiq/daily-plan/today?${params.toString()}`);
    },
    [athleteId, localDate, timezone]
  );

  const apply = useCallback((result: AthleteIqClientResult<DailyPlanTodayResponse>) => {
    if (result.ok) {
      setPlan(result.data.plan);
      setError(false);
    } else {
      setError(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;
    fetchPlan().then((result) => {
      if (active) apply(result);
    });
    return () => {
      active = false;
    };
  }, [fetchPlan, apply]);

  function reload() {
    setLoading(true);
    setError(false);
    void fetchPlan().then(apply);
  }

  async function generatePlan() {
    setBusy("generate");
    const result = await athleteIqRequest<DailyPlanMutationResponse>(
      "/api/athleteiq/daily-plan/generate",
      athleteIqJsonInit({ athleteId, localDate, timezone })
    );
    if (result.ok) setPlan(result.data.plan);
    else setError(true);
    setBusy(null);
  }

  async function setTaskState(task: DailyTask, completionState: DailyTaskCompletionState) {
    setBusy(task.id);
    const result = await athleteIqRequest<DailyPlanMutationResponse>(
      `/api/athleteiq/daily-plan/tasks/${encodeURIComponent(task.id)}`,
      athleteIqJsonInit({ athleteId, localDate, completionState }, "PATCH")
    );
    if (result.ok) setPlan(result.data.plan);
    else setError(true);
    setBusy(null);
  }

  if (loading) return <Text className="aiq-muted">{t("common.loading")}</Text>;

  if (error && !plan) {
    return (
      <Stack gap="sm">
        <Text className="aiq-muted">{t("common.loadError")}</Text>
        <Button variant="light" color="yellow" size="sm" onClick={reload}>
          {t("common.retry")}
        </Button>
      </Stack>
    );
  }

  if (!plan) {
    return (
      <Stack gap="sm">
        <Text className="aiq-muted">{t("dailyPlan.empty")}</Text>
        <Button color="yellow" size="sm" loading={busy === "generate"} onClick={() => void generatePlan()}>
          {t("dailyPlan.generate")}
        </Button>
      </Stack>
    );
  }

  const openCount = plan.tasks.filter((task) => task.completionState === "open").length;

  return (
    <Stack gap="md">
      <Box className="aiq-row-card">
        <Stack gap={4}>
          <Group justify="space-between" gap="sm">
            <Text fw={900}>{t("dailyPlan.recommendationTitle")}</Text>
            <Badge color={plan.recommendation.blockedByPainGuardrail ? "red" : "tactical"} variant="light">
              {t(`dailyPlan.intensity.${plan.recommendation.intensity}`)}
            </Badge>
          </Group>
          <Text size="sm" className="aiq-muted">
            {t(`dailyPlan.sessionType.${plan.recommendation.type}`)} · {plan.recommendation.durationRange}
          </Text>
          {plan.recommendation.rationale.map((code) => (
            <Text key={code} size="sm" className="aiq-muted-soft">{domain(code)}</Text>
          ))}
        </Stack>
      </Box>

      <Text size="sm" className="aiq-muted-soft">{t("dailyPlan.openCount", { count: openCount, total: plan.tasks.length })}</Text>

      {plan.tasks.map((task) => (
        <Box key={task.id} className={task.completionState === "open" ? "aiq-row-card" : "aiq-row-card aiq-row-card-muted"}>
          <Stack gap="xs">
            <Group justify="space-between" align="flex-start" gap="sm">
              <Text fw={800}>{domain(task.titleKey)}</Text>
              <Badge color={task.completionState === "completed" ? "tactical" : task.completionState === "dismissed" ? "gray" : PRIORITY_COLOR[task.priority]} variant="light">
                {task.completionState === "open" ? t(`dailyPlan.priority.${task.priority}`) : t(`dailyPlan.state.${task.completionState}`)}
              </Badge>
            </Group>
            <Text size="sm" className="aiq-muted">{domain(task.descriptionKey)}</Text>
            <Text size="sm" className="aiq-muted-faint">{t(`dailyPlan.dueWindow.${task.dueWindow}`)}</Text>
            <Group gap="xs">
              {task.completionState === "open" ? (
                <>
                  <Button color="yellow" size="sm" variant="light" loading={busy === task.id} onClick={() => void setTaskState(task, "completed")}>
                    {t("dailyPlan.complete")}
                  </Button>
                  <Button size="sm" variant="default" disabled={busy === task.id} onClick={() => void setTaskState(task, "dismissed")}>
                    {t("dailyPlan.dismiss")}
                  </Button>
                </>
              ) : (
                <Button size="sm" variant="default" loading={busy === task.id} onClick={() => void setTaskState(task, "open")}>
                  {t("dailyPlan.reopen")}
                </Button>
              )}
            </Group>
          </Stack>
        </Box>
      ))}
    </Stack>
  );
}
