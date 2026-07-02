"use client";

import { useCallback, useEffect, useState } from "react";
import { Box, Button, Group, NumberInput, Paper, Progress, Slider, Stack, Text, Textarea } from "@mantine/core";
import { PageHeader, SectionPanel, SemanticButton, StateBlock } from "@doneisbetter/gds/client";
import { useTranslations } from "next-intl";
import { athleteIqJsonInit, athleteIqRequest } from "@/lib/athleteiq-client";
import {
  createSessionTimer,
  sessionTimerReducer,
  type SessionTimerState,
} from "@/lib/session-timer";
import type { SessionBlueprint } from "@/lib/session-blueprints";

type BlueprintsResponse = { blueprints: SessionBlueprint[] };
type SessionResponse = { session: { sessionId: string } };

function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// Interactive blueprint session runner (TRN-002, #83). Timer state is pure and
// client-only (no persistence); only the final debrief is saved through the
// existing session lifecycle. Accessible: the timer status is announced via an
// aria-live region, every control is a labelled button, and there is no custom
// motion to respect prefers-reduced-motion.
export function SessionRunner({ athleteId }: { athleteId: string }) {
  const t = useTranslations("SessionRunner");
  const td = useTranslations("SessionBlueprints");
  const [localDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [blueprints, setBlueprints] = useState<SessionBlueprint[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [selected, setSelected] = useState<SessionBlueprint | null>(null);
  const [timer, setTimer] = useState<SessionTimerState | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState(false);
  const [saved, setSaved] = useState(false);
  const [debrief, setDebrief] = useState({ rpe: 5, completionPct: 100, painAfter: 1, moodAfter: 5, notes: "" });

  // Retry handler (event-driven) — may set state synchronously.
  const loadBlueprints = useCallback(() => {
    setLoadError(false);
    setBlueprints(null);
    fetch("/api/session-blueprints")
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("load"))))
      .then((data: BlueprintsResponse) => setBlueprints(data.blueprints ?? []))
      .catch(() => setLoadError(true));
  }, []);

  // Initial load — only sets state asynchronously inside the fetch resolution so
  // the effect never triggers a synchronous cascading render.
  useEffect(() => {
    let active = true;
    fetch("/api/session-blueprints")
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("load"))))
      .then((data: BlueprintsResponse) => {
        if (active) setBlueprints(data.blueprints ?? []);
      })
      .catch(() => {
        if (active) setLoadError(true);
      });
    return () => {
      active = false;
    };
  }, []);

  // Tick once per second while running; the interval is recreated whenever the
  // run status changes and torn down on unmount.
  useEffect(() => {
    if (timer?.status !== "running") return;
    const id = setInterval(() => setTimer((current) => (current ? sessionTimerReducer(current, { type: "tick" }) : current)), 1000);
    return () => clearInterval(id);
  }, [timer?.status]);

  const dispatch = (action: Parameters<typeof sessionTimerReducer>[1]) =>
    setTimer((current) => (current ? sessionTimerReducer(current, action) : current));

  async function startSession(blueprint: SessionBlueprint) {
    setBusy(true);
    setActionError(false);
    const result = await athleteIqRequest<SessionResponse>(
      "/api/athleteiq/sessions",
      athleteIqJsonInit({ athleteId, localDate, blueprintKey: blueprint.key })
    );
    if (result.ok) {
      setSessionId(result.data.session.sessionId);
      setSelected(blueprint);
      setTimer(sessionTimerReducer(createSessionTimer(blueprint), { type: "play" }));
    } else {
      setActionError(true);
    }
    setBusy(false);
  }

  async function saveDebrief() {
    if (!sessionId) return;
    setBusy(true);
    setActionError(false);
    const result = await athleteIqRequest<SessionResponse>(
      `/api/athleteiq/sessions/${encodeURIComponent(sessionId)}/debrief`,
      athleteIqJsonInit(debrief)
    );
    if (result.ok) setSaved(true);
    else setActionError(true);
    setBusy(false);
  }

  if (loadError) {
    return (
      <SectionPanel title={t("title")}>
        <Stack gap="sm">
          <StateBlock variant="error" title={t("loadError")} />
          <Button variant="light" onClick={loadBlueprints}>{t("retry")}</Button>
        </Stack>
      </SectionPanel>
    );
  }

  // Blueprint picker.
  if (!selected || !timer) {
    return (
      <Stack gap="lg">
        <PageHeader title={t("title")} subtitle={t("subtitle")} />
        <SectionPanel title={t("pickBlueprint")}>
          {blueprints === null ? (
            <Text c="dimmed">{t("loading")}</Text>
          ) : blueprints.length === 0 ? (
            <StateBlock variant="empty" title={t("empty")} />
          ) : (
            <Stack gap="md">
              {actionError ? <StateBlock variant="error" title={t("saveError")} /> : null}
              {blueprints.map((blueprint) => {
                const totalMinutes = Math.round(blueprint.drills.reduce((sum, d) => sum + d.seconds, 0) / 60);
                return (
                  <Paper key={blueprint.key} withBorder p="md" radius="md">
                    <Group justify="space-between" align="center" wrap="wrap">
                      <Box>
                        <Text fw={700}>{td(`titles.${blueprint.titleKey}`)}</Text>
                        <Text size="sm" c="dimmed">
                          {t("durationLabel", { minutes: totalMinutes, drills: blueprint.drills.length })}
                        </Text>
                      </Box>
                      <SemanticButton action="start" color="ingress" loading={busy} onClick={() => void startSession(blueprint)}>
                        {t("start")}
                      </SemanticButton>
                    </Group>
                  </Paper>
                );
              })}
            </Stack>
          )}
        </SectionPanel>
      </Stack>
    );
  }

  const currentDrill = selected.drills[timer.drillIndex];
  const drillTotal = timer.drillSeconds[timer.drillIndex] || 1;
  const elapsed = drillTotal - timer.secondsRemaining;
  const progress = Math.min(100, Math.round((elapsed / drillTotal) * 100));
  const completed = timer.status === "completed";

  return (
    <Stack gap="lg">
      <PageHeader title={td(`titles.${selected.titleKey}`)} subtitle={t("subtitle")} />

      <SectionPanel title={t("currentDrill")}>
        <Stack gap="md">
          {/* Screen-reader announcement of the live timer state. */}
          <Box role="status" aria-live="polite" aria-atomic="true">
            <Text size="xl" fw={800}>{td(`drills.${currentDrill.titleKey}`)}</Text>
            <Text size="xl" fw={900}>{formatClock(timer.secondsRemaining)}</Text>
            <Text size="sm" c="dimmed">
              {t("drillProgress", { current: timer.drillIndex + 1, total: selected.drills.length })} · {t(`status.${timer.status}`)}
            </Text>
          </Box>

          <Progress value={completed ? 100 : progress} aria-hidden="true" />

          {!completed ? (
            <Group gap="sm" wrap="wrap">
              {timer.status === "running" ? (
                <Button onClick={() => dispatch({ type: "pause" })}>{t("pause")}</Button>
              ) : (
                <Button color="ingress" onClick={() => dispatch({ type: "play" })}>{t("play")}</Button>
              )}
              <Button variant="default" onClick={() => dispatch({ type: "skip" })}>{t("skip")}</Button>
              <Button variant="default" onClick={() => dispatch({ type: "reset" })}>{t("reset")}</Button>
            </Group>
          ) : null}
        </Stack>
      </SectionPanel>

      {completed ? (
        <SectionPanel title={t("debriefTitle")}>
          {saved ? (
            <StateBlock variant="success" title={t("saved")} />
          ) : (
            <Stack gap="md">
              {actionError ? <StateBlock variant="error" title={t("saveError")} /> : null}
              <Box>
                <Text size="sm" fw={600} id="rpe-label">{t("rpeLabel", { value: debrief.rpe })}</Text>
                <Slider min={1} max={10} value={debrief.rpe} onChange={(v) => setDebrief((d) => ({ ...d, rpe: v }))} aria-labelledby="rpe-label" />
              </Box>
              <NumberInput label={t("completionLabel")} min={0} max={100} value={debrief.completionPct} onChange={(v) => setDebrief((d) => ({ ...d, completionPct: typeof v === "number" ? v : 0 }))} />
              <Box>
                <Text size="sm" fw={600} id="pain-label">{t("painLabel", { value: debrief.painAfter })}</Text>
                <Slider min={1} max={10} value={debrief.painAfter} onChange={(v) => setDebrief((d) => ({ ...d, painAfter: v }))} aria-labelledby="pain-label" />
              </Box>
              <Box>
                <Text size="sm" fw={600} id="mood-label">{t("moodLabel", { value: debrief.moodAfter })}</Text>
                <Slider min={1} max={10} value={debrief.moodAfter} onChange={(v) => setDebrief((d) => ({ ...d, moodAfter: v }))} aria-labelledby="mood-label" />
              </Box>
              <Textarea label={t("notesLabel")} value={debrief.notes} maxLength={1000} onChange={(e) => setDebrief((d) => ({ ...d, notes: e.currentTarget.value }))} autosize minRows={2} />
              <SemanticButton action="save" color="ingress" loading={busy} onClick={() => void saveDebrief()}>
                {t("save")}
              </SemanticButton>
            </Stack>
          )}
        </SectionPanel>
      ) : null}
    </Stack>
  );
}
