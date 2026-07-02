"use client";

import { Text } from "@mantine/core";
import { Badge, Box, Button, Group, NumberInput, Select, Stack, TextInput } from "@doneisbetter/gds/client";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { athleteIqJsonInit, athleteIqRequest, type AthleteIqClientResult } from "@/lib/athleteiq-client";
import { selectCopyKey } from "@/lib/copy-variants";
import { neutralPromptDef } from "@/lib/surface-voice";
import type { AthleteIqSession, AthleteIqSessionState } from "@/types/athleteiq-session";
import { useAthleteIqDomainCopy } from "../useAthleteIqDomainCopy";
import { getProductColor } from "@/lib/product-ui-contracts";

type SessionListResponse = { sessions: AthleteIqSession[]; count: number };
type SessionMutationResponse = { session: AthleteIqSession };
type SessionBlueprint = { key: string; titleKey: string; variant: string };
type BlueprintListResponse = { blueprints: SessionBlueprint[] };

type DebriefDraft = { rpe: number; completionPct: number; painAfter: number; moodAfter: number; notes: string };

const STATE_COLOR: Record<AthleteIqSessionState, string> = {
  draft: getProductColor("athlete_iq", "neutral"),
  active: getProductColor("athlete_iq", "success"),
  paused: getProductColor("athlete_iq", "warning"),
  completed: getProductColor("athlete_iq", "success"),
  abandoned: getProductColor("athlete_iq", "risk")
};

const NEXT_STATES: Record<AthleteIqSessionState, AthleteIqSessionState[]> = {
  draft: ["active", "abandoned"],
  active: ["paused", "completed", "abandoned"],
  paused: ["active", "completed", "abandoned"],
  completed: [],
  abandoned: []
};

const DEFAULT_DEBRIEF: DebriefDraft = { rpe: 5, completionPct: 100, painAfter: 1, moodAfter: 5, notes: "" };

export function AiqSessionPanel({ athleteId, localDate, timezone }: { athleteId: string; localDate: string; timezone: string }) {
  const t = useTranslations("ProductSurfaces.athleteIq.athleteWorkspace.panels");
  const tb = useTranslations("SessionBlueprints");
  const domain = useAthleteIqDomainCopy();
  const [nowMs] = useState(Date.now);
  const [sessions, setSessions] = useState<AthleteIqSession[]>([]);
  const [blueprints, setBlueprints] = useState<SessionBlueprint[]>([]);
  const [selectedBlueprint, setSelectedBlueprint] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [debriefs, setDebriefs] = useState<Record<string, DebriefDraft>>({});

  const fetchSessions = useCallback(
    () => {
      const params = new URLSearchParams({ athleteId, from: localDate, to: localDate });
      return athleteIqRequest<SessionListResponse>(`/api/athleteiq/sessions?${params.toString()}`);
    },
    [athleteId, localDate]
  );

  const apply = useCallback((result: AthleteIqClientResult<SessionListResponse>) => {
    if (result.ok) setSessions(result.data.sessions);
    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;
    fetchSessions().then((result) => {
      if (active) apply(result);
    });
    return () => {
      active = false;
    };
  }, [fetchSessions, apply]);

  useEffect(() => {
    let active = true;
    athleteIqRequest<BlueprintListResponse>("/api/session-blueprints").then((result) => {
      if (active && result.ok) setBlueprints(result.data.blueprints);
    });
    return () => {
      active = false;
    };
  }, []);

  async function buildFromBlueprint() {
    if (!selectedBlueprint) return;
    setBusy("from-blueprint");
    setFeedback(null);
    const result = await athleteIqRequest<SessionMutationResponse>(
      "/api/athleteiq/sessions",
      athleteIqJsonInit({ athleteId, localDate, blueprintKey: selectedBlueprint })
    );
    if (result.ok) applySession(result.data.session);
    else setFeedback(t("session.buildError"));
    setBusy(null);
  }

  function applySession(updated: AthleteIqSession) {
    setSessions((current) => {
      const exists = current.some((session) => session.sessionId === updated.sessionId);
      return exists ? current.map((session) => (session.sessionId === updated.sessionId ? updated : session)) : [...current, updated];
    });
  }

  async function buildFromPlan() {
    setBusy("from-plan");
    setFeedback(null);
    const result = await athleteIqRequest<SessionMutationResponse>(
      "/api/athleteiq/sessions/from-plan",
      athleteIqJsonInit({ athleteId, localDate, timezone })
    );
    if (result.ok) applySession(result.data.session);
    else setFeedback(t("session.buildError"));
    setBusy(null);
  }

  async function transition(session: AthleteIqSession, state: AthleteIqSessionState) {
    setBusy(`${session.sessionId}:${state}`);
    setFeedback(null);
    const reason = reasons[session.sessionId]?.trim();
    const result = await athleteIqRequest<SessionMutationResponse>(
      `/api/athleteiq/sessions/${encodeURIComponent(session.sessionId)}/state`,
      athleteIqJsonInit({ state, ...(reason ? { reason } : {}) }, "PATCH")
    );
    if (result.ok) applySession(result.data.session);
    else setFeedback(t("session.transitionError"));
    setBusy(null);
  }

  async function submitDebrief(session: AthleteIqSession) {
    const draft = debriefs[session.sessionId] ?? DEFAULT_DEBRIEF;
    setBusy(`${session.sessionId}:debrief`);
    setFeedback(null);
    const result = await athleteIqRequest<SessionMutationResponse>(
      `/api/athleteiq/sessions/${encodeURIComponent(session.sessionId)}/debrief`,
      athleteIqJsonInit({ rpe: draft.rpe, completionPct: draft.completionPct, painAfter: draft.painAfter, moodAfter: draft.moodAfter, notes: draft.notes.trim() || undefined })
    );
    if (result.ok) applySession(result.data.session);
    else setFeedback(t("session.debriefError"));
    setBusy(null);
  }

  function debriefDraft(sessionId: string): DebriefDraft {
    return debriefs[sessionId] ?? DEFAULT_DEBRIEF;
  }

  function patchDebrief(sessionId: string, patch: Partial<DebriefDraft>) {
    setDebriefs((current) => ({ ...current, [sessionId]: { ...debriefDraft(sessionId), ...patch } }));
  }

  if (loading) return <Text className="aiq-muted">{t("common.loading")}</Text>;

  return (
    <Stack gap="md">
      <Group justify="space-between" gap="sm" align="flex-end" wrap="wrap">
        <Text size="sm" className="aiq-muted-soft">{t("session.todayTitle")}</Text>
        <Group gap="sm" align="flex-end" wrap="wrap">
          {blueprints.length > 0 ? (
            <Group gap="xs" align="flex-end">
              <Select
                size="sm"
                placeholder={t("session.blueprintPlaceholder")}
                data={blueprints.map((blueprint) => ({ value: blueprint.key, label: tb(`titles.${blueprint.titleKey}`) }))}
                value={selectedBlueprint}
                onChange={setSelectedBlueprint}
                clearable
              />
              <Button size="sm" variant="light" loading={busy === "from-blueprint"} disabled={!selectedBlueprint} onClick={() => void buildFromBlueprint()}>
                {t("session.buildFromBlueprint")}
              </Button>
            </Group>
          ) : null}
          <Button color={getProductColor("athlete_iq", "primaryAction")} size="sm" variant="light" loading={busy === "from-plan"} onClick={() => void buildFromPlan()}>
            {t("session.buildFromPlan")}
          </Button>
        </Group>
      </Group>

      {feedback ? <Text size="sm" style={{ color: "var(--status-error)" }}>{feedback}</Text> : null}
      {sessions.length === 0 ? <Text className="aiq-muted">{t(selectCopyKey(neutralPromptDef("session.empty"), { now: nowMs }))}</Text> : null}

      {sessions.map((session) => {
        const canDebrief = session.state !== "draft" && session.state !== "abandoned";
        const draft = debriefDraft(session.sessionId);
        return (
          <Box key={session.sessionId} className="aiq-row-card">
            <Stack gap="sm">
              <Group justify="space-between" align="flex-start" gap="sm">
                <Stack gap={2}>
                  <Text fw={900}>{t(`session.type.${session.recommendation.type}`)}</Text>
                  <Text size="sm" className="aiq-muted-soft">{session.recommendation.durationRange}</Text>
                </Stack>
                <Badge color={STATE_COLOR[session.state]} variant="light">{t(`session.state.${session.state}`)}</Badge>
              </Group>

              <Stack gap={4}>
                {session.blocks.map((block, index) => (
                  <Text key={`${session.sessionId}-${index}`} size="sm" className="aiq-muted">
                    {t(`session.block.${block.type}`)} · {t("session.blockMinutes", { minutes: block.durationMinutes })} · {block.intensity}
                  </Text>
                ))}
              </Stack>

              {NEXT_STATES[session.state].length > 0 ? (
                <Stack gap="xs">
                  <Group gap="xs">
                    {NEXT_STATES[session.state].map((state) => (
                      <Button
                        key={state}
                        color={getProductColor("athlete_iq", state === "abandoned" ? "risk" : "primaryAction")}
                        size="sm"
                        variant={state === "abandoned" ? "default" : "light"}
                        loading={busy === `${session.sessionId}:${state}`}
                        disabled={state === "abandoned" && !reasons[session.sessionId]?.trim()}
                        onClick={() => void transition(session, state)}
                      >
                        {t(`session.action.${state}`)}
                      </Button>
                    ))}
                  </Group>
                  <TextInput
                    size="sm"
                    placeholder={t("session.abandonReason")}
                    value={reasons[session.sessionId] ?? ""}
                    onChange={(event) => setReasons((current) => ({ ...current, [session.sessionId]: event.currentTarget.value }))}
                  />
                </Stack>
              ) : null}

              {canDebrief ? (
                <Box className="aiq-row-card aiq-row-card-muted">
                  <Stack gap="xs">
                    <Text fw={800} size="sm">{t("session.debriefTitle")}</Text>
                    <Group grow>
                      <NumberInput label={t("session.rpe")} value={draft.rpe} min={1} max={10} onChange={(value) => patchDebrief(session.sessionId, { rpe: toNumber(value, draft.rpe) })} />
                      <NumberInput label={t("session.completionPct")} value={draft.completionPct} min={0} max={100} onChange={(value) => patchDebrief(session.sessionId, { completionPct: toNumber(value, draft.completionPct) })} />
                    </Group>
                    <Group grow>
                      <NumberInput label={t("session.painAfter")} value={draft.painAfter} min={1} max={10} onChange={(value) => patchDebrief(session.sessionId, { painAfter: toNumber(value, draft.painAfter) })} />
                      <NumberInput label={t("session.moodAfter")} value={draft.moodAfter} min={1} max={10} onChange={(value) => patchDebrief(session.sessionId, { moodAfter: toNumber(value, draft.moodAfter) })} />
                    </Group>
                    <TextInput label={t("session.notes")} placeholder={t(selectCopyKey(neutralPromptDef("session.notesPlaceholder"), { now: nowMs, seed: session.sessionId }))} value={draft.notes} onChange={(event) => patchDebrief(session.sessionId, { notes: event.currentTarget.value })} />
                    {session.log.rpe !== undefined ? (
                      <Text size="sm" className="aiq-muted-faint">{t("session.recordedLoad", { load: session.log.estimatedLoadPoints })}</Text>
                    ) : null}
                    <Group justify="flex-end">
                      <Button color={getProductColor("athlete_iq", "primaryAction")} size="sm" loading={busy === `${session.sessionId}:debrief`} onClick={() => void submitDebrief(session)}>
                        {t("session.saveDebrief")}
                      </Button>
                    </Group>
                  </Stack>
                </Box>
              ) : null}

              {session.recommendation.rationale.map((code) => (
                <Text key={code} size="sm" className="aiq-muted-faint">{domain(code)}</Text>
              ))}
            </Stack>
          </Box>
        );
      })}
    </Stack>
  );
}

function toNumber(value: number | string, fallback: number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
