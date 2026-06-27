"use client";

import { Box, Group, Select, Stack, Text, Textarea, TextInput } from "@mantine/core";
import { SemanticButton } from "@doneisbetter/gds/client";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { athleteIqJsonInit, athleteIqRequest, type AthleteIqClientResult } from "@/lib/athleteiq-client";
import type { ReflectionEntryView, ReflectionVisibility } from "@/types/athleteiq-reflection";

type ReflectionDayResponse = { reflections: ReflectionEntryView[]; count: number };
type ReflectionCreateResponse = { skipped: boolean; reflection: unknown };

const VISIBILITIES: ReflectionVisibility[] = ["private", "coach_summary", "parent_summary"];

export function AiqReflectionPanel({ athleteId, localDate }: { athleteId: string; localDate: string }) {
  const t = useTranslations("ProductSurfaces.athleteIq.athleteWorkspace.panels");
  const [entries, setEntries] = useState<ReflectionEntryView[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [moodTag, setMoodTag] = useState("");
  const [visibility, setVisibility] = useState<ReflectionVisibility>("private");
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<"error" | null>(null);

  const visibilityOptions = useMemo(
    () => VISIBILITIES.map((value) => ({ value, label: t(`reflection.visibility.${value}`) })),
    [t]
  );

  const fetchEntries = useCallback(
    () => {
      const params = new URLSearchParams({ athleteId, date: localDate });
      return athleteIqRequest<ReflectionDayResponse>(`/api/athleteiq/reflections/day?${params.toString()}`);
    },
    [athleteId, localDate]
  );

  const apply = useCallback((result: AthleteIqClientResult<ReflectionDayResponse>) => {
    if (result.ok) setEntries(result.data.reflections);
    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;
    fetchEntries().then((result) => {
      if (active) apply(result);
    });
    return () => {
      active = false;
    };
  }, [fetchEntries, apply]);

  async function save() {
    if (!body.trim()) return;
    setSaving(true);
    setFeedback(null);
    const result = await athleteIqRequest<ReflectionCreateResponse>(
      "/api/athleteiq/reflections",
      athleteIqJsonInit({ athleteId, localDate, body, moodTag: moodTag.trim() || undefined, visibility })
    );
    if (result.ok) {
      setBody("");
      setMoodTag("");
      apply(await fetchEntries());
    } else {
      setFeedback("error");
    }
    setSaving(false);
  }

  async function changeVisibility(entry: ReflectionEntryView, nextVisibility: ReflectionVisibility) {
    setBusyId(entry.id);
    const result = await athleteIqRequest(
      `/api/athleteiq/reflections/${encodeURIComponent(entry.id)}/visibility`,
      athleteIqJsonInit({ visibility: nextVisibility }, "PATCH")
    );
    if (result.ok) {
      setEntries((current) => current.map((item) => (item.id === entry.id ? { ...item, visibility: nextVisibility } : item)));
    } else {
      setFeedback("error");
    }
    setBusyId(null);
  }

  return (
    <Stack gap="md">
      <Box className="aiq-row-card">
        <Stack gap="sm">
          <Textarea
            label={t("reflection.bodyLabel")}
            placeholder={t("reflection.bodyPlaceholder")}
            value={body}
            onChange={(event) => setBody(event.currentTarget.value)}
            autosize
            minRows={3}
            maxRows={8}
            maxLength={5000}
          />
          <Group grow align="flex-end">
            <TextInput label={t("reflection.moodLabel")} placeholder={t("reflection.moodPlaceholder")} value={moodTag} onChange={(event) => setMoodTag(event.currentTarget.value)} />
            <Select label={t("reflection.visibilityLabel")} data={visibilityOptions} value={visibility} onChange={(value) => setVisibility((value as ReflectionVisibility) ?? "private")} allowDeselect={false} />
          </Group>
          {feedback === "error" ? <Text size="sm" style={{ color: "var(--status-error)" }}>{t("common.actionFailed")}</Text> : null}
          <Group justify="flex-end">
            <SemanticButton action="save" color="yellow" size="sm" loading={saving} disabled={!body.trim()} onClick={() => void save()}>
              {t("reflection.save")}
            </SemanticButton>
          </Group>
        </Stack>
      </Box>

      <Text size="sm" className="aiq-muted-soft">{t("reflection.todayTitle")}</Text>
      {loading ? <Text className="aiq-muted">{t("common.loading")}</Text> : null}
      {!loading && entries.length === 0 ? <Text className="aiq-muted">{t("reflection.empty")}</Text> : null}
      {entries.map((entry) => (
        <Box key={entry.id} className="aiq-row-card">
          <Stack gap="xs">
            <Text size="sm">{entry.rawBodyAvailable && entry.body ? entry.body : entry.safeSummary}</Text>
            {entry.moodTag ? <Text size="sm" className="aiq-muted-faint">{entry.moodTag}</Text> : null}
            <Group gap="sm" align="flex-end">
              <Select
                label={t("reflection.visibilityLabel")}
                data={visibilityOptions}
                value={entry.visibility}
                onChange={(value) => value && void changeVisibility(entry, value as ReflectionVisibility)}
                disabled={busyId === entry.id}
                allowDeselect={false}
                size="sm"
              />
            </Group>
          </Stack>
        </Box>
      ))}
    </Stack>
  );
}
