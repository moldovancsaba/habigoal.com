"use client";

import { useCallback, useEffect, useState } from "react";
import { Box, Loader, Stack, Group, SimpleGrid, Select, PageHeader, SectionPanel, SemanticButton, StateBlock } from "@sovereignsquad/gds/client";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Paper, Text } from "@/components/gds/SurfacePrimitives";
import { athleteIqRequest, type AthleteIqClientResult } from "@/lib/athleteiq-client";
import { toParentSummaryView, type ParentSummaryView } from "@/lib/parent-summary-view";
import type { AthleteProfile } from "@/types/athlete";
import type { ParentProjection } from "@/types/athleteiq-stakeholder";

type SummaryResponse = { projection: ParentProjection };
type LinksResult = { ok: boolean; list: AthleteProfile[] };

export default function ParentPortalPage() {
  const t = useTranslations("ParentPortal");
  const ta = useTranslations();

  const [athletes, setAthletes] = useState<AthleteProfile[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [linkLoading, setLinkLoading] = useState(true);
  const [linkError, setLinkError] = useState(false);

  const [summary, setSummary] = useState<ParentSummaryView | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState(false);

  // Pure fetchers — never call setState, so they are safe to invoke from an
  // effect. setState happens only in the `apply*` callbacks (inside `.then`).
  const fetchLinks = useCallback(async (): Promise<LinksResult> => {
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

  const applyLinks = useCallback((result: LinksResult) => {
    if (result.ok) {
      setAthletes(result.list);
      setSelectedId((current) => current ?? (result.list[0]?._id ?? null));
      setLinkError(false);
      // A summary fetch will follow for the first child; if there is none, the
      // empty state renders instead.
      setSummaryLoading(result.list.length > 0);
    } else {
      setLinkError(true);
    }
    setLinkLoading(false);
  }, []);

  const fetchSummary = useCallback(
    (athleteId: string) =>
      athleteIqRequest<SummaryResponse>(
        `/api/athleteiq/parents/summary?athleteId=${encodeURIComponent(athleteId)}&timezone=UTC`
      ),
    []
  );

  const applySummary = useCallback((result: AthleteIqClientResult<SummaryResponse>) => {
    if (result.ok && result.data?.projection) {
      setSummary(toParentSummaryView(result.data.projection));
      setSummaryError(false);
    } else {
      setSummary(null);
      setSummaryError(true);
    }
    setSummaryLoading(false);
  }, []);

  useEffect(() => {
    let active = true;
    fetchLinks().then((result) => {
      if (active) applyLinks(result);
    });
    return () => {
      active = false;
    };
  }, [fetchLinks, applyLinks]);

  useEffect(() => {
    if (!selectedId) return;
    let active = true;
    fetchSummary(selectedId).then((result) => {
      if (active) applySummary(result);
    });
    return () => {
      active = false;
    };
  }, [selectedId, fetchSummary, applySummary]);

  function reloadLinks() {
    setLinkLoading(true);
    setLinkError(false);
    void fetchLinks().then(applyLinks);
  }

  function onSelectChild(value: string | null) {
    if (!value || value === selectedId) return;
    setSelectedId(value);
    setSummary(null);
    setSummaryError(false);
    setSummaryLoading(true);
  }

  function retrySummary() {
    if (!selectedId) return;
    setSummaryLoading(true);
    setSummaryError(false);
    void fetchSummary(selectedId).then(applySummary);
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
          <SemanticButton action="refresh" variant="light" onClick={reloadLinks}>{t("retry")}</SemanticButton>
        </Stack>
      </Box>
    );
  }

  const selectedAthlete = athletes.find((athlete) => athlete._id === selectedId) ?? null;
  const childOptions = athletes
    .filter((athlete) => athlete._id)
    .map((athlete) => ({ value: athlete._id as string, label: athlete.name }));

  return (
    <Stack gap="xl" pb="xl">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      {athletes.length === 0 ? (
        <SectionPanel title={t("linkedAthletes")}>
          <StateBlock variant="info" title={t("noLinked")} description={t("noLinkedHelp")} />
        </SectionPanel>
      ) : (
        <>
          {athletes.length > 1 ? (
            <SectionPanel title={t("linkedAthletes")}>
              <Select
                label={t("selectChild")}
                data={childOptions}
                value={selectedId}
                onChange={onSelectChild}
                allowDeselect={false}
                aria-label={t("selectChild")}
              />
            </SectionPanel>
          ) : null}

          <SectionPanel title={t("summaryTitle", { name: selectedAthlete?.name ?? "" })}>
            {summaryLoading ? (
              <Group role="status" aria-live="polite">
                <Loader size="sm" />
                <Text c="dimmed">{t("summaryLoading")}</Text>
              </Group>
            ) : summaryError ? (
              <Stack gap="md" align="flex-start" role="alert">
                <StateBlock variant="error" title={t("summaryError")} description={t("summaryErrorHelp")} />
                <SemanticButton action="refresh" variant="light" onClick={retrySummary}>
                  {t("retry")}
                </SemanticButton>
              </Stack>
            ) : summary ? (
              <Stack gap="md">
                <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                  <StateBlock variant="info" title={t("statusTitle")} description={summary.summary} />
                  <StateBlock
                    variant="success"
                    title={t("tasksTitle")}
                    description={t("tasksDone", { count: summary.completedTasks })}
                  />
                </SimpleGrid>

                {summary.safeNotes.length > 0 ? (
                  <Paper withBorder p="md">
                    <Text fw={700} mb="xs">{t("notesTitle")}</Text>
                    <Stack gap={4} component="ul" style={{ paddingInlineStart: "1.1rem", margin: 0 }}>
                      {summary.safeNotes.map((note, index) => (
                        <Text key={`${index}-${note.slice(0, 12)}`} component="li" size="sm">{note}</Text>
                      ))}
                    </Stack>
                  </Paper>
                ) : null}

                <Paper withBorder p="md">
                  <Text fw={700} mb="xs">{t("supportTitle")}</Text>
                  <Text size="sm">{ta(summary.supportActionKey)}</Text>
                </Paper>

                {summary.hasRedactions ? (
                  <StateBlock variant="info" title={t("privacyTitle")} description={t("privacyHelp")} />
                ) : null}

                {selectedAthlete?._id ? (
                  <Group>
                    <Link href={`/dashboard/reports?athleteId=${selectedAthlete._id}`}>
                      <SemanticButton action="dashboard" variant="light">{t("reports")}</SemanticButton>
                    </Link>
                    <Link href={`/dashboard/digital-twin?athleteId=${selectedAthlete._id}`}>
                      <SemanticButton action="dashboard" variant="outline">{t("digitalTwin")}</SemanticButton>
                    </Link>
                  </Group>
                ) : null}
              </Stack>
            ) : (
              <StateBlock variant="info" title={t("noSummary")} description={t("noSummaryHelp")} />
            )}
          </SectionPanel>
        </>
      )}
    </Stack>
  );
}
