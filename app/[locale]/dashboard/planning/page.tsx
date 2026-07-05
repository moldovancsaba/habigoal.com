"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Box, Stack, Text, Paper, SimpleGrid, Group, Badge, TextInput, NumberInput, Loader, Select } from "@mantine/core";
import { PageHeader, SectionPanel, SemanticButton } from "@sovereignsquad/gds/client";
import type { SessionCategory } from "@/types/training-plan";
import { analyzeWeeklyLoad } from "@/lib/training-load-balance";
import { getProductColor } from "@/lib/product-ui-contracts";

interface SessionRow {
  sessionId: string;
  title: string;
  category: SessionCategory;
  date: string;
  plannedLoadPoints: number;
}

interface MicrocycleRow {
  microcycleId: string;
  teamId: string;
  startDate: string;
  endDate: string;
  goal: string;
}

const CATEGORIES: SessionCategory[] = ["strength", "tactical", "endurance", "speed", "recovery", "match"];

export default function SessionPlannerPage() {
  const t = useTranslations("PlanningDashboard");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [microcycles, setMicrocycles] = useState<MicrocycleRow[]>([]);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftCategory, setDraftCategory] = useState<SessionCategory>("tactical");
  const [draftLoad, setDraftLoad] = useState<number | string>(300);
  const [cycleGoal, setCycleGoal] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [sessionRes, cycleRes] = await Promise.all([
          fetch("/api/training-sessions"),
          fetch("/api/microcycles"),
        ]);
        if (sessionRes.ok) {
          const json = await sessionRes.json();
          if (!cancelled) setSessions(json.plans ?? []);
        }
        if (cycleRes.ok) {
          const json = await cycleRes.json();
          if (!cancelled) setMicrocycles(json.microcycles ?? []);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [refreshKey]);

  const handleCreate = async () => {
    setSaving(true);
    try {
      await fetch("/api/training-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: draftTitle || t("newSessionDefault"),
          category: draftCategory,
          date: new Date().toISOString().split("T")[0],
          durationMinutes: 60,
          plannedLoadPoints: Number(draftLoad),
          description: "",
          organisationId: "default",
          coachId: "coach",
        }),
      });
      setDraftTitle("");
      setRefreshKey((k) => k + 1);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateMicrocycle = async () => {
    setSaving(true);
    try {
      const start = new Date();
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      await fetch("/api/microcycles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId: "default",
          startDate: start.toISOString().split("T")[0],
          endDate: end.toISOString().split("T")[0],
          goal: cycleGoal || t("cycleGoalPlaceholder"),
          sessionIds: sessions.slice(0, 3).map((s) => s.sessionId),
        }),
      });
      setCycleGoal("");
      setRefreshKey((k) => k + 1);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Box p="xl"><Loader /></Box>;
  }

  return (
    <Stack gap="md">
      <PageHeader title={t("title")} />
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
        <SectionPanel title={t("createSession")}>
          <Stack gap="md">
            <TextInput
              label={t("sessionTitle")}
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.currentTarget.value)}
              placeholder={t("sessionTitlePlaceholder")}
            />
            <Select
              label={t("category")}
              data={CATEGORIES.map((c) => ({ value: c, label: t(`categories.${c}`) }))}
              value={draftCategory}
              onChange={(v) => setDraftCategory((v as SessionCategory) ?? "tactical")}
            />
            <NumberInput label={t("plannedLoad")} value={draftLoad} onChange={setDraftLoad} />
            <Group justify="flex-end">
              <SemanticButton action="save" color={getProductColor("dashboard", "primaryAction")} onClick={handleCreate} loading={saving} disabled={!draftTitle} />
            </Group>
          </Stack>
        </SectionPanel>
        <SectionPanel title={t("upcomingSessions")}>
          <Stack gap="md">
            {sessions.length === 0 && <Text c="dimmed">{t("noSessions")}</Text>}
            {sessions.length > 0 && (
              <Text size="sm" c="dimmed">
                {t("weeklyLoadSummary", {
                  points: sessions.reduce((sum, session) => sum + (session.plannedLoadPoints || 0), 0),
                  count: sessions.length
                })}
              </Text>
            )}
            {sessions.map((session) => (
              <Paper key={session.sessionId} withBorder p="md" radius="md">
                <Group justify="space-between">
                  <Box>
                    <Text fw={700}>{session.title}</Text>
                    <Text size="sm" c="dimmed">{t("dateLabel", { date: session.date })}</Text>
                  </Box>
                  <Group>
                    <Badge color={getProductColor("dashboard", "primaryAction")} variant="light">{t(`categories.${session.category}`)}</Badge>
                    <Badge color="gray" variant="filled">{t("loadPoints", { points: session.plannedLoadPoints })}</Badge>
                  </Group>
                </Group>
              </Paper>
            ))}
          </Stack>
        </SectionPanel>
      </SimpleGrid>
      {sessions.length > 0 && (() => {
        const balance = analyzeWeeklyLoad(sessions);
        return (
          <SectionPanel title={t("loadBalanceTitle")}>
            <Stack gap="sm">
              <Text size="sm" c="dimmed">{t("peakDay", { points: balance.peakDayLoad })}</Text>
              <Group gap="xs" wrap="wrap">
                {balance.byDay.map((day) => (
                  <Badge key={day.date} variant={day.overloaded ? "filled" : "light"} color={day.overloaded ? getProductColor("dashboard", "risk") : getProductColor("dashboard", "primaryAction")}>
                    {t("dayLoad", { date: day.date, points: day.totalLoad })}
                  </Badge>
                ))}
              </Group>
              {balance.conflicts.map((conflict, index) => (
                <Text key={`${conflict.date}-${index}`} size="sm" style={{ color: "var(--status-error)" }}>
                  {conflict.type === "overload"
                    ? t("overloadWarning", { date: conflict.date, load: conflict.load })
                    : t("consecutiveWarning", { date: conflict.date, previousDate: conflict.previousDate })}
                </Text>
              ))}
            </Stack>
          </SectionPanel>
        );
      })()}

      <SectionPanel title={t("microcyclesTitle")}>
        <Stack gap="md">
          <TextInput
            label={t("cycleGoal")}
            value={cycleGoal}
            onChange={(e) => setCycleGoal(e.currentTarget.value)}
            placeholder={t("cycleGoalPlaceholder")}
          />
          <Text size="sm" c="dimmed">{t("cycleHint")}</Text>
          <Group justify="flex-start">
            <SemanticButton action="add" color={getProductColor("dashboard", "primaryAction")} onClick={handleCreateMicrocycle} loading={saving} disabled={sessions.length === 0}>
              {t("createCycle")}
            </SemanticButton>
          </Group>
          {microcycles.map((cycle) => (
            <Paper key={cycle.microcycleId} withBorder p="md">
              <Text fw={600}>{cycle.goal}</Text>
              <Text size="sm" c="dimmed">{cycle.startDate} → {cycle.endDate}</Text>
            </Paper>
          ))}
        </Stack>
      </SectionPanel>
    </Stack>
  );
}
