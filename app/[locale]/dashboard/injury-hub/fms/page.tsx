"use client";

import { useCallback, useEffect, useState } from "react";
import { Box, Checkbox, Group, Loader, Select, SimpleGrid, Stack, Textarea, PageHeader, SectionPanel, SemanticButton, StateBlock } from "@sovereignsquad/gds/client";
import { useTranslations } from "next-intl";
import { Paper, Text } from "@/components/gds/SurfacePrimitives";
import { FMS_SUBTESTS, type FmsSubtest } from "@/lib/athleteiq-fms";
import { getProductColor } from "@/lib/product-ui-contracts";
import type { AthleteProfile } from "@/types/athlete";
import type { FmsScreen } from "@/types/athleteiq-fms";

const SCORE_OPTIONS = ["3", "2", "1", "0"];

type AthletesResult = { ok: boolean; list: AthleteProfile[] };

function emptyScores(): Record<FmsSubtest, string> {
  return FMS_SUBTESTS.reduce((acc, subtest) => ({ ...acc, [subtest]: "2" }), {} as Record<FmsSubtest, string>);
}
function emptyPain(): Record<FmsSubtest, boolean> {
  return FMS_SUBTESTS.reduce((acc, subtest) => ({ ...acc, [subtest]: false }), {} as Record<FmsSubtest, boolean>);
}

export default function InjuryHubFmsPage() {
  const t = useTranslations("InjuryHubFms");

  const [athletes, setAthletes] = useState<AthleteProfile[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [linkLoading, setLinkLoading] = useState(true);
  const [linkError, setLinkError] = useState(false);

  const [scores, setScores] = useState<Record<FmsSubtest, string>>(emptyScores);
  const [painFlags, setPainFlags] = useState<Record<FmsSubtest, boolean>>(emptyPain);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [savedComposite, setSavedComposite] = useState<number | null>(null);

  const [history, setHistory] = useState<FmsScreen[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchAthletes = useCallback(async (): Promise<AthletesResult> => {
    try {
      const res = await fetch("/api/athletes");
      if (!res.ok) return { ok: false, list: [] };
      const data = await res.json();
      const list: AthleteProfile[] = Array.isArray(data) ? data : Array.isArray(data?.athletes) ? data.athletes : [];
      return { ok: true, list };
    } catch {
      return { ok: false, list: [] };
    }
  }, []);

  const applyAthletes = useCallback((result: AthletesResult) => {
    if (result.ok) {
      setAthletes(result.list);
      setSelectedId((current) => current ?? (result.list[0]?._id ?? null));
      setLinkError(false);
    } else {
      setLinkError(true);
    }
    setLinkLoading(false);
  }, []);

  const fetchHistory = useCallback((athleteId: string) => fetch(`/api/athletes/${encodeURIComponent(athleteId)}/fms`), []);
  const applyHistory = useCallback(async (res: Response) => {
    const data = await res.json().catch(() => null);
    setHistory(res.ok && Array.isArray(data?.screens) ? data.screens : []);
    setHistoryLoading(false);
  }, []);

  useEffect(() => {
    let active = true;
    fetchAthletes().then((result) => {
      if (active) applyAthletes(result);
    });
    return () => {
      active = false;
    };
  }, [fetchAthletes, applyAthletes]);

  useEffect(() => {
    if (!selectedId) return;
    let active = true;
    fetchHistory(selectedId).then((res) => {
      if (active) void applyHistory(res);
    });
    return () => {
      active = false;
    };
  }, [selectedId, fetchHistory, applyHistory]);

  function onSelectAthlete(value: string | null) {
    setSelectedId(value);
    setScores(emptyScores());
    setPainFlags(emptyPain());
    setNotes("");
    setSavedComposite(null);
    setSaveError(false);
    setHistory([]);
    setHistoryLoading(Boolean(value));
  }

  async function save() {
    if (!selectedId) return;
    setSaving(true);
    setSaveError(false);
    setSavedComposite(null);
    const payload = {
      scores: FMS_SUBTESTS.reduce((acc, subtest) => ({ ...acc, [subtest]: Number(scores[subtest]) }), {} as Record<FmsSubtest, number>),
      painFlags: FMS_SUBTESTS.reduce((acc, subtest) => ({ ...acc, [subtest]: painFlags[subtest] }), {} as Record<FmsSubtest, boolean>),
      notes: notes.trim() || undefined
    };
    try {
      const res = await fetch(`/api/athletes/${encodeURIComponent(selectedId)}/fms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("save failed");
      const data = await res.json();
      setSavedComposite(typeof data?.screen?.composite === "number" ? data.screen.composite : null);
      setHistoryLoading(true);
      void fetchHistory(selectedId).then(applyHistory);
    } catch {
      setSaveError(true);
    }
    setSaving(false);
  }

  if (linkLoading) {
    return (
      <Box style={{ display: "flex", justifyContent: "center", paddingBlock: "2rem" }}>
        <Loader />
      </Box>
    );
  }

  if (linkError) {
    return (
      <Box p="xl">
        <Stack gap="md" align="flex-start">
          <StateBlock variant="error" title={t("loadError")} />
          <SemanticButton
            action="refresh"
            variant="light"
            onClick={() => {
              setLinkLoading(true);
              setLinkError(false);
              void fetchAthletes().then(applyAthletes);
            }}
          >
            {t("retry")}
          </SemanticButton>
        </Stack>
      </Box>
    );
  }

  const athleteOptions = athletes
    .filter((athlete) => athlete._id)
    .map((athlete) => ({ value: athlete._id as string, label: athlete.name }));

  return (
    <Stack gap="xl" pb="xl">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      {athletes.length === 0 ? (
        <SectionPanel title={t("athlete")}>
          <StateBlock variant="info" title={t("noAthletes")} description={t("noAthletesHelp")} />
        </SectionPanel>
      ) : (
        <>
          <SectionPanel title={t("athlete")}>
            <Select
              label={t("selectAthlete")}
              data={athleteOptions}
              value={selectedId}
              onChange={onSelectAthlete}
              allowDeselect={false}
              aria-label={t("selectAthlete")}
            />
          </SectionPanel>

          <SectionPanel title={t("screenTitle")}>
            <Stack gap="md">
              <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                {FMS_SUBTESTS.map((subtest) => (
                  <Paper withBorder p="md" key={subtest}>
                    <Stack gap="xs">
                      <Text fw={600}>{t(`subtests.${subtest}`)}</Text>
                      <Select
                        label={t("scoreLabel")}
                        data={SCORE_OPTIONS.map((value) => ({ value, label: t(`scoreOption.${value}`) }))}
                        value={painFlags[subtest] ? "0" : scores[subtest]}
                        onChange={(value) => setScores((prev) => ({ ...prev, [subtest]: value ?? "2" }))}
                        allowDeselect={false}
                        disabled={painFlags[subtest]}
                        aria-label={`${t(`subtests.${subtest}`)} ${t("scoreLabel")}`}
                      />
                      <Checkbox
                        label={t("painLabel")}
                        checked={painFlags[subtest]}
                        onChange={(event) => setPainFlags((prev) => ({ ...prev, [subtest]: event.currentTarget.checked }))}
                      />
                    </Stack>
                  </Paper>
                ))}
              </SimpleGrid>

              <Textarea
                label={t("notesLabel")}
                placeholder={t("notesPlaceholder")}
                value={notes}
                onChange={(event) => setNotes(event.currentTarget.value)}
                autosize
                minRows={2}
                maxRows={5}
                maxLength={1000}
              />

              {savedComposite !== null ? (
                <StateBlock
                  variant="success"
                  title={t("savedTitle")}
                  description={t("compositeValue", { value: savedComposite })}
                />
              ) : null}
              {saveError ? (
                <Text size="sm" role="alert" style={{ color: "var(--status-error)" }}>{t("saveError")}</Text>
              ) : null}

              <Group justify="flex-end">
                <SemanticButton action="save" color={getProductColor("dashboard", "primaryAction")} loading={saving} disabled={!selectedId || saving} onClick={() => void save()}>
                  {t("save")}
                </SemanticButton>
              </Group>
            </Stack>
          </SectionPanel>

          <SectionPanel title={t("historyTitle")}>
            {historyLoading ? (
              <Group role="status" aria-live="polite">
                <Loader size="sm" />
                <Text c="dimmed">{t("historyLoading")}</Text>
              </Group>
            ) : history.length === 0 ? (
              <StateBlock variant="info" title={t("historyEmpty")} description={t("historyEmptyHelp")} />
            ) : (
              <Stack gap="sm">
                {history.map((screen) => (
                  <Paper withBorder p="md" key={screen.id ?? `${screen.date}-${screen.composite}`}>
                    <Group justify="space-between">
                      <Text fw={600}>{screen.date}</Text>
                      <Text fw={700}>{t("compositeValue", { value: screen.composite })}</Text>
                    </Group>
                    {screen.notes ? <Text size="sm" c="dimmed">{screen.notes}</Text> : null}
                  </Paper>
                ))}
              </Stack>
            )}
          </SectionPanel>
        </>
      )}
    </Stack>
  );
}
