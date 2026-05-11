"use client";

import { useEffect, useMemo, useState, use } from "react";
import { Badge, Box, Button, Group, Loader, Modal, Paper, SegmentedControl, SimpleGrid, Stack, Table, Text, TextInput } from "@mantine/core";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionCard } from "@/components/ui/SectionCard";
import { ResponsiveDataCard, ResponsiveDataRow } from "@/components/ui/ResponsiveDataCard";
import { PdfService } from "@/lib/pdf-service";
import { getUsers } from "@/services/user-service";
import { withDisplayNamesForReport } from "@/lib/report-user-display";
import { LongitudinalChart } from "@/components/analytics/LongitudinalChart";
import { BenchmarkChart } from "@/components/analytics/BenchmarkChart";
import { SparklineChart } from "@/components/analytics/SparklineChart";
import { ReadinessGauge } from "@/components/analytics/ReadinessGauge";
import { athleteIqPillars, readinessChecklist, getReadinessMode } from "@/lib/athlete-iq-survey";
import { getCompatiblePillarScore, getCompatibleReadinessState } from "@/lib/assessment-compat";
import type { CheckInRecord } from "@/types/check-in";
import type { AthleteProfile } from "@/types/athlete";

type AthleteHistoryPayload = {
  child: AthleteProfile;
  assessments: CheckInRecord[];
};

type TrendWindow = "7d" | "30d" | "all" | "custom";
type TrendMetric = "readiness" | "movement" | "social" | "mental" | "ski";

const PILLAR_COLORS: Record<string, string> = {
  physical_pillar: "var(--mantine-color-tactical-6)",
  mental_pillar: "var(--mantine-color-synthesis-6)",
  sport_brain_pillar: "var(--mantine-color-strategy-6)"
};

export default function AthleteHistoryPage({ params }: { params: Promise<{ id: string; locale: string }> }) {
  const { id, locale } = use(params);
  const t = useTranslations("Assessment");
  const tc = useTranslations("Common");
  const td = useTranslations("Dashboard");
  const ts = useTranslations("Schema");
  const tr = useTranslations("Report");
  const emptyValue = tc("emptyValue");

  const [data, setData] = useState<AthleteHistoryPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deletingSurvey, setDeletingSurvey] = useState(false);
  const [trendWindow, setTrendWindow] = useState<TrendWindow>("30d");
  const [trendMetric, setTrendMetric] = useState<TrendMetric>("readiness");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  useEffect(() => {
    fetch(`/api/athletes/${id}/history`)
      .then((res) => res.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [id]);

  async function downloadPdf() {
    if (!data || !latest) return;

    setDownloadingPdf(true);
    try {
      const users = await getUsers();
      const printableRecord = withDisplayNamesForReport(latest, users);
      await PdfService.generateMapReport(printableRecord, t, tc, ts, tr, data.assessments);
    } catch (error) {
      console.error("PDF generation failed:", error);
    } finally {
      setDownloadingPdf(false);
    }
  }

  async function deleteLatestSurvey() {
    if (!latest?._id) return;
    setDeletingSurvey(true);
    const response = await fetch(`/api/check-ins/${latest._id}`, { method: "DELETE" }).catch(() => null);
    setDeletingSurvey(false);
    if (!response?.ok) return;
    setData((current) => current ? { ...current, assessments: current.assessments.slice(0, -1) } : current);
    setDeleteModalOpen(false);
    setDeleteConfirmText("");
  }

  const chronologicalAssessments = useMemo(
    () =>
      (data?.assessments ?? []).slice().sort((a, b) => {
        const sessionDelta = new Date(a.session.date).getTime() - new Date(b.session.date).getTime();
        if (sessionDelta !== 0) return sessionDelta;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }),
    [data]
  );
  const latest = chronologicalAssessments[chronologicalAssessments.length - 1] ?? null;
  const effectiveCustomStartDate = customStartDate || chronologicalAssessments[0]?.session.date || "";
  const effectiveCustomEndDate = customEndDate || chronologicalAssessments[chronologicalAssessments.length - 1]?.session.date || "";

  const filteredAssessments = useMemo(
    () => filterAssessmentsByWindow(chronologicalAssessments, trendWindow, effectiveCustomStartDate, effectiveCustomEndDate),
    [chronologicalAssessments, effectiveCustomEndDate, effectiveCustomStartDate, trendWindow]
  );

  const latestFiltered = filteredAssessments[filteredAssessments.length - 1] ?? null;
  const baselineFiltered = filteredAssessments[0] ?? null;

  const pillarSeries = useMemo(
    () =>
      athleteIqPillars.map((pillar) => ({
        ...pillar,
        translatedTitle: t(pillar.title),
        current: latestFiltered ? getCompatiblePillarScore(latestFiltered, pillar.key) : 0,
        baseline: baselineFiltered ? getCompatiblePillarScore(baselineFiltered, pillar.key) : 0,
        trend: filteredAssessments.map((assessment) => ({
          date: assessment.session.date,
          value: getCompatiblePillarScore(assessment, pillar.key)
        }))
      })),
    [baselineFiltered, filteredAssessments, latestFiltered, t]
  );

  const readinessTimeline = useMemo(
    () =>
      filteredAssessments.map((assessment) => ({
        date: assessment.session.date,
        value: getCompatibleReadinessState(assessment).gaugeValue
      })),
    [filteredAssessments]
  );

  const trendMetricLabel = td(`athleteTrendMetric${capitalize(trendMetric)}`);
  const trendSeries = useMemo(
    () =>
      filteredAssessments.map((assessment) => ({
        date: assessment.session.date,
        value: getTrendMetricValue(assessment, trendMetric)
      })),
    [filteredAssessments, trendMetric]
  );
  const trendLatestValue = trendSeries[trendSeries.length - 1]?.value ?? null;
  const trendBaselineValue = trendSeries[0]?.value ?? null;
  const trendAverageValue = trendSeries.length
    ? Number((trendSeries.reduce((sum, point) => sum + point.value, 0) / trendSeries.length).toFixed(2))
    : null;
  const trendChangeValue = trendLatestValue !== null && trendBaselineValue !== null
    ? Number((trendLatestValue - trendBaselineValue).toFixed(2))
    : null;
  const trendWindowSummary = getTrendWindowSummary(trendWindow, effectiveCustomStartDate, effectiveCustomEndDate, td);

  const benchmarkData = useMemo(
    () =>
      pillarSeries.map((pillar) => ({
        subject: pillar.translatedTitle,
        individual: pillar.current,
        average: pillar.baseline
      })),
    [pillarSeries]
  );

  const strongestPillar = useMemo(() => getStrongestPillar(pillarSeries, emptyValue), [emptyValue, pillarSeries]);
  const focusPillar = useMemo(() => getFocusPillar(pillarSeries, emptyValue), [emptyValue, pillarSeries]);
  const latestReadinessState = latest ? getCompatibleReadinessState(latest) : { count: 0, total: readinessChecklist.length, gaugeValue: 0 };
  const latestReadinessChecks = latestReadinessState.count;
  const latestReadinessTotal = latestReadinessState.total;
  const latestReadinessMode = getReadinessMode(latestReadinessChecks, latestReadinessTotal);
  const athleteOperatingScore = latest ? getAthleteOperatingScore(latest) : 0;
  const athleteMomentum = useMemo(() => getAthleteMomentum(chronologicalAssessments), [chronologicalAssessments]);
  const athleteOperatingActions = latest ? getAthleteOperatingActions(latest, focusPillar, athleteMomentum, t, td) : [];

  if (loading) {
    return (
      <Box style={{ display: "flex", justifyContent: "center", paddingBlock: "2rem" }} role="status">
        <Loader aria-label={tc("loading")} />
      </Box>
    );
  }

  if (!data) {
    return (
      <Text c="red" py="md">
        {tc("error")}
      </Text>
    );
  }

  return (
    <Stack gap="lg">
      <PageHeader
        title={data.child.name}
        subtitle={td("athleteHistorySubtitle", { date: data.child.birthDate, sessions: data.assessments.length })}
        actions={
          <Group gap="sm" wrap="wrap" className="mobile-actions-stack">
            <Button
              component={Link}
              href={latest?._id ? `/dashboard/assessment?id=${latest._id}` : "/dashboard/assessment"}
              variant="default"
              disabled={data.assessments.length === 0}
            >
              {tc("update")}
            </Button>
            <Button color="ingress" onClick={() => void downloadPdf()} loading={downloadingPdf} disabled={data.assessments.length === 0}>
              {td("downloadPdf")}
            </Button>
            <Button color="red" onClick={() => setDeleteModalOpen(true)} disabled={data.assessments.length === 0}>
              {t("deleteSurveyTitle")}
            </Button>
          </Group>
        }
      />

      {data.assessments.length === 0 ? (
        <SectionCard title={td("athleteHistoryEmptyTitle")} subheader={td("athleteHistoryEmptySubtitle")}>
          <Text c="dimmed">{t("noHistory")}</Text>
        </SectionCard>
      ) : (
        <>
          <SectionCard
            title={td("athleteDailyOperatingTitle")}
            subheader={td("athleteDailyOperatingSubtitle")}
            action={
              <Group gap="sm" wrap="wrap">
                <Badge color={getReadinessModeBadgeColor(latestReadinessMode)} size="lg">
                  {td("athleteDailyOperatingModeBadge", { mode: t(`readinessMode${capitalize(latestReadinessMode)}`) })}
                </Badge>
                <Badge variant="light" color={getMomentumBadgeColor(athleteMomentum.state)}>
                  {td(`athleteMomentum${capitalize(athleteMomentum.state)}`)}
                </Badge>
              </Group>
            }
          >
            <Stack gap="md">
              <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
                <HistoryMetricCard label={td("athleteDailyOperatingScoreLabel")} value={String(athleteOperatingScore)} accent="ingress" />
                <HistoryMetricCard label={td("athleteDailyReadinessModeLabel")} value={t(`readinessMode${capitalize(latestReadinessMode)}`)} accent="knowmore" />
                <HistoryMetricCard label={td("athleteDailyMomentumLabel")} value={td(`athleteMomentum${capitalize(athleteMomentum.state)}`)} accent="strategy" />
                <HistoryMetricCard label={td("athleteDailyFocusLabel")} value={focusPillar} accent="review" />
              </SimpleGrid>

              <Paper withBorder p="md" radius="md">
                <Stack gap="xs">
                  <Text fw={700}>{td("athleteDailySummaryTitle")}</Text>
                  <Text c="dimmed">
                    {td("athleteDailySummaryBody", {
                      readiness: latestReadinessState.gaugeValue.toFixed(1),
                      checks: latestReadinessChecks,
                      total: latestReadinessTotal,
                      strongest: strongestPillar,
                      focus: focusPillar
                    })}
                  </Text>
                </Stack>
              </Paper>

              <SimpleGrid cols={{ base: 1, lg: 3 }} spacing="md">
                {athleteOperatingActions.map((action, index) => (
                  <Paper key={`${action.title}-${index}`} withBorder p="md" radius="md">
                    <Stack gap={6}>
                      <Text fw={700}>{action.title}</Text>
                      <Text size="sm" c="dimmed">{action.body}</Text>
                    </Stack>
                  </Paper>
                ))}
              </SimpleGrid>
            </Stack>
          </SectionCard>

          <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
            <HistoryMetricCard label={td("athleteSessionsLabel")} value={String(data.assessments.length)} accent="ingress" />
            <HistoryMetricCard
              label={td("athleteReadinessChecksLabel")}
              value={`${latestReadinessChecks}/${latestReadinessTotal}`}
              accent="knowmore"
            />
            <HistoryMetricCard label={td("athleteStrongestPillarLabel")} value={strongestPillar} accent="strategy" />
            <HistoryMetricCard label={td("athleteFocusPillarLabel")} value={focusPillar} accent="review" />
          </SimpleGrid>

          <SectionCard title={td("athleteTrendExplorerTitle")} subheader={td("athleteTrendExplorerSubtitle")}>
            <Stack gap="md">
              <SimpleGrid cols={{ base: 1, xl: 2 }} spacing="md">
                <Stack gap="xs">
                  <Text size="sm" fw={600}>{td("athleteTrendWindowLabel")}</Text>
                  <SegmentedControl
                    value={trendWindow}
                    onChange={(value) => setTrendWindow(value as TrendWindow)}
                    data={[
                      { label: td("athleteTrendWindow7d"), value: "7d" },
                      { label: td("athleteTrendWindow30d"), value: "30d" },
                      { label: td("athleteTrendWindowAll"), value: "all" },
                      { label: td("athleteTrendWindowCustom"), value: "custom" }
                    ]}
                    fullWidth
                  />
                </Stack>

                <Stack gap="xs">
                  <Text size="sm" fw={600}>{td("athleteTrendMetricLabel")}</Text>
                  <SegmentedControl
                    value={trendMetric}
                    onChange={(value) => setTrendMetric(value as TrendMetric)}
                    data={[
                      { label: td("athleteTrendMetricReadiness"), value: "readiness" },
                      { label: td("athleteTrendMetricMovement"), value: "movement" },
                      { label: td("athleteTrendMetricSocial"), value: "social" },
                      { label: td("athleteTrendMetricMental"), value: "mental" },
                      { label: td("athleteTrendMetricSki"), value: "ski" }
                    ]}
                    fullWidth
                  />
                </Stack>
              </SimpleGrid>

              {trendWindow === "custom" ? (
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                  <TextInput
                    type="date"
                    label={td("athleteTrendStartDateLabel")}
                    value={effectiveCustomStartDate}
                    onChange={(event) => setCustomStartDate(event.currentTarget.value)}
                  />
                  <TextInput
                    type="date"
                    label={td("athleteTrendEndDateLabel")}
                    value={effectiveCustomEndDate}
                    onChange={(event) => setCustomEndDate(event.currentTarget.value)}
                  />
                </SimpleGrid>
              ) : null}

              {trendSeries.length === 0 ? (
                <Text c="dimmed">{td("athleteTrendNoData")}</Text>
              ) : (
                <>
                  <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
                    <HistoryMetricCard label={td("athleteTrendSessionsLabel")} value={String(filteredAssessments.length)} accent="ingress" />
                    <HistoryMetricCard label={td("athleteTrendAverageLabel")} value={formatTrendValue(trendAverageValue)} accent="strategy" />
                    <HistoryMetricCard label={td("athleteTrendLatestLabel")} value={formatTrendValue(trendLatestValue)} accent="knowmore" />
                    <HistoryMetricCard
                      label={td("athleteTrendChangeLabel")}
                      value={formatTrendDelta(trendChangeValue)}
                      accent={trendChangeValue !== null && trendChangeValue >= 0 ? "ingress" : "review"}
                    />
                  </SimpleGrid>

                  <LongitudinalChart
                    title={td("athleteTrendChartTitle", { metric: trendMetricLabel })}
                    data={trendSeries}
                    color={getTrendMetricColor(trendMetric)}
                    yDomain={[0, 5]}
                  />

                  <Text size="sm" c="dimmed">
                    {td("athleteTrendInsight", {
                      range: trendWindowSummary,
                      metric: trendMetricLabel,
                      latest: formatTrendValue(trendLatestValue),
                      average: formatTrendValue(trendAverageValue)
                    })}
                  </Text>
                </>
              )}
            </Stack>
          </SectionCard>

          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
            <SectionCard title={td("athleteSessionProfileTitle")} subheader={td("athleteSessionProfileSubtitle")}>
              <BenchmarkChart
                title={td("athleteLatestVsBaselineTitle")}
                data={benchmarkData}
                labels={{
                  individual: td("currentAssessment"),
                  average: td("baselineAssessment")
                }}
              />
              <Text size="sm" c="dimmed" mt="xs">
                {td("athleteProfileInsight", {
                  strongest: strongestPillar,
                  focus: focusPillar
                })}
              </Text>
            </SectionCard>

            <SectionCard title={td("athleteReadinessTitle")} subheader={td("athleteReadinessSubtitle")}>
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                <ReadinessGauge
                  value={latestReadinessState.gaugeValue}
                  max={5}
                  title={td("athleteReadinessGaugeTitle")}
                  subtitle={t(`readinessMode${capitalize(latestReadinessMode)}`)}
                />
                <LongitudinalChart
                  title={td("athleteReadinessTimelineTitle")}
                  data={readinessTimeline}
                  color="var(--mantine-color-knowmore-6)"
                  yDomain={[0, 5]}
                />
              </SimpleGrid>
              <Text size="sm" c="dimmed" mt="xs">
                {td("athleteReadinessInsight", {
                  checks: latestReadinessChecks,
                  total: latestReadinessTotal,
                  mode: t(`readinessMode${capitalize(latestReadinessMode)}`)
                })}
              </Text>
            </SectionCard>
          </SimpleGrid>

          <SectionCard
            title={td("athletePillarEvolutionTitle")}
            subheader={td("athletePillarEvolutionSubtitle", { range: trendWindowSummary })}
          >
            <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
              {pillarSeries.map((pillar) => (
                <LongitudinalChart
                  key={pillar.key}
                  title={pillar.translatedTitle}
                  data={pillar.trend}
                  color={PILLAR_COLORS[pillar.key]}
                />
              ))}
            </SimpleGrid>
          </SectionCard>

          <SectionCard title={td("athleteSessionLogTitle")} subheader={td("athleteSessionLogSubtitle")}>
            <Stack gap="md" hiddenFrom="sm">
              {data.assessments.map((assessment) => {
                const profile = getSessionProfile(assessment, t, emptyValue);
                return (
                  <ResponsiveDataCard
                    key={assessment._id}
                    onClick={() => window.location.href = `/${locale}/dashboard/records/${assessment._id}`}
                    title={assessment.session.date}
                  >
                    <ResponsiveDataRow label={tc("mode")} value={t("appTitle")} />
                    <ResponsiveDataRow label={td("athleteReadinessChecksLabel")} value={`${getCompatibleReadinessState(assessment).count}/${getCompatibleReadinessState(assessment).total}`} />
                    <ResponsiveDataRow label={td("athleteStrongestPillarLabel")} value={profile.strongest} />
                    <ResponsiveDataRow label={td("athleteFocusPillarLabel")} value={profile.focus} />
                    <ResponsiveDataRow label={td("athleteCompletionLabel")} value={`${assessment.computed.completion.done}/${assessment.computed.completion.total}`} />
                    <ResponsiveDataRow label={td("athleteProfileShapeLabel")} value={<SparklineChart data={profile.sparkline} width="100%" height={42} />} />
                  </ResponsiveDataCard>
                );
              })}
            </Stack>
            <Paper withBorder p={0} visibleFrom="sm">
              <Table striped highlightOnHover verticalSpacing="sm">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>{tc("date")}</Table.Th>
                    <Table.Th>{tc("mode")}</Table.Th>
                    <Table.Th>{td("athleteReadinessChecksLabel")}</Table.Th>
                    <Table.Th>{td("athleteStrongestPillarLabel")}</Table.Th>
                    <Table.Th>{td("athleteFocusPillarLabel")}</Table.Th>
                    <Table.Th>{td("athleteCompletionLabel")}</Table.Th>
                    <Table.Th>{td("athleteProfileShapeLabel")}</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {data.assessments.map((assessment) => {
                    const profile = getSessionProfile(assessment, t, emptyValue);
                    return (
                      <Table.Tr
                        key={assessment._id}
                        onClick={() => window.location.href = `/${locale}/dashboard/records/${assessment._id}`}
                        style={{ cursor: "pointer" }}
                      >
                        <Table.Td>{assessment.session.date}</Table.Td>
                        <Table.Td>
                          <Badge variant="outline" size="sm" color="gray">
                            {t("appTitle")}
                          </Badge>
                        </Table.Td>
                        <Table.Td>{`${getCompatibleReadinessState(assessment).count}/${getCompatibleReadinessState(assessment).total}`}</Table.Td>
                        <Table.Td>{profile.strongest}</Table.Td>
                        <Table.Td>{profile.focus}</Table.Td>
                        <Table.Td>{`${assessment.computed.completion.done}/${assessment.computed.completion.total}`}</Table.Td>
                        <Table.Td>
                          <SparklineChart data={profile.sparkline} />
                        </Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
            </Paper>
            <Text size="sm" c="dimmed" mt="xs">
              {td("insightChildHistoryCount", { count: data.assessments.length })}
            </Text>
          </SectionCard>

          <SectionCard title={t("evidenceImages")}>
            {data.assessments.filter((assessment) => assessment.attachments.length > 0).length === 0 ? (
              <Text c="dimmed">{t("noImages")}</Text>
            ) : (
              <Stack gap="md">
                {data.assessments
                  .filter((assessment) => assessment.attachments.length > 0)
                  .map((assessment) => (
                    <Paper key={assessment._id} withBorder p="sm">
                      <Text size="sm" fw={600} mb="xs">
                        {assessment.session.date}
                      </Text>
                      <SimpleGrid cols={{ base: 1, xs: 2, md: 3 }} spacing="sm">
                        {assessment.attachments.map((attachment) => {
                          const isPdf = attachment.mimeType === "application/pdf" || attachment.url.toLowerCase().endsWith(".pdf");
                          return (
                            <Paper key={attachment.id} withBorder p="xs" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", minWidth: 0 }}>
                              {isPdf ? (
                                <Box style={{ height: 110, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--mantine-color-gray-0)", borderRadius: "var(--mantine-radius-md)" }}>
                                  <Stack align="center" gap={4}>
                                    <Text size="xl" style={{ fontSize: 40 }}>📄</Text>
                                    <Text size="sm" c="dimmed" style={{ textAlign: "center", paddingInline: 8 }}>{attachment.name || t("pdfReportFallback")}</Text>
                                  </Stack>
                                </Box>
                              ) : (
                                <Image
                                  src={attachment.thumbUrl || attachment.url}
                                  alt={attachment.name || t("evidenceImageAlt")}
                                  width={160}
                                  height={110}
                                  style={{ width: "100%", height: "auto", borderRadius: "var(--mantine-radius-md)" }}
                                  unoptimized
                                />
                              )}
                              <Button
                                component="a"
                                href={attachment.url}
                                download={attachment.name || t("reportFileName")}
                                target="_blank"
                                rel="noreferrer"
                                variant="light"
                                size="sm"
                                mt={8}
                                fullWidth
                              >
                                {isPdf ? tc("download") : tc("view")}
                              </Button>
                            </Paper>
                          );
                        })}
                      </SimpleGrid>
                    </Paper>
                  ))}
              </Stack>
            )}
          </SectionCard>
        </>
      )}

      <DeleteSurveyModal
        opened={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        confirmValue={deleteConfirmText}
        onConfirmValueChange={setDeleteConfirmText}
        onDelete={() => void deleteLatestSurvey()}
        deleting={deletingSurvey}
      />
    </Stack>
  );
}

function getSessionProfile(record: CheckInRecord, translate: (key: string) => string, emptyValue: string) {
  const scoredPillars = athleteIqPillars.map((pillar) => ({
    key: pillar.key,
    label: translate(pillar.title),
    value: getCompatiblePillarScore(record, pillar.key)
  }));
  const strongest = [...scoredPillars].sort((a, b) => b.value - a.value)[0];
  const focus = [...scoredPillars].sort((a, b) => a.value - b.value)[0];
  return {
    strongest: strongest?.label ?? emptyValue,
    focus: focus?.label ?? emptyValue,
    sparkline: scoredPillars.map((pillar) => pillar.value)
  };
}

function getStrongestPillar(pillars: Array<{ translatedTitle: string; current: number }>, emptyValue: string) {
  const strongest = [...pillars].sort((a, b) => b.current - a.current)[0];
  return strongest?.translatedTitle ?? emptyValue;
}

function getFocusPillar(pillars: Array<{ translatedTitle: string; current: number }>, emptyValue: string) {
  const focus = [...pillars].sort((a, b) => a.current - b.current)[0];
  return focus?.translatedTitle ?? emptyValue;
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function filterAssessmentsByWindow(
  assessments: CheckInRecord[],
  window: TrendWindow,
  customStartDate: string,
  customEndDate: string
) {
  if (assessments.length === 0) return [];

  const latestDate = toUtcDate(assessments[assessments.length - 1].session.date);
  if (!latestDate) return assessments;

  if (window === "all") return assessments;

  if (window === "custom") {
    const start = customStartDate ? toUtcDate(customStartDate) : null;
    const end = customEndDate ? toUtcDate(customEndDate) : null;
    return assessments.filter((assessment) => {
      const date = toUtcDate(assessment.session.date);
      if (!date) return false;
      if (start && date < start) return false;
      if (end && date > end) return false;
      return true;
    });
  }

  const days = window === "7d" ? 7 : 30;
  const startBoundary = new Date(latestDate);
  startBoundary.setUTCDate(startBoundary.getUTCDate() - (days - 1));

  return assessments.filter((assessment) => {
    const date = toUtcDate(assessment.session.date);
    return Boolean(date && date >= startBoundary && date <= latestDate);
  });
}

function getTrendMetricValue(assessment: CheckInRecord, metric: TrendMetric) {
  if (metric === "readiness") return getCompatibleReadinessState(assessment).gaugeValue;
  if (metric === "movement") return assessment.computed.movementAverage ?? 0;
  if (metric === "social") return assessment.computed.socialAverage ?? 0;
  if (metric === "mental") return assessment.computed.mentalAverage ?? 0;
  return assessment.computed.ski ?? 0;
}

function getTrendMetricColor(metric: TrendMetric) {
  if (metric === "readiness") return "var(--mantine-color-knowmore-6)";
  if (metric === "movement") return "var(--mantine-color-tactical-6)";
  if (metric === "social") return "var(--mantine-color-synthesis-6)";
  if (metric === "mental") return "var(--mantine-color-strategy-6)";
  return "var(--mantine-color-ingress-6)";
}

function formatTrendValue(value: number | null) {
  return value === null ? "-" : value.toFixed(2);
}

function formatTrendDelta(value: number | null) {
  if (value === null) return "-";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}`;
}

function getTrendWindowSummary(window: TrendWindow, customStartDate: string, customEndDate: string, translate: (key: string) => string) {
  if (window === "7d") return translate("athleteTrendWindow7d");
  if (window === "30d") return translate("athleteTrendWindow30d");
  if (window === "all") return translate("athleteTrendWindowAll");
  if (!customStartDate && !customEndDate) return translate("athleteTrendWindowCustom");
  if (customStartDate && customEndDate) {
    return `${customStartDate} - ${customEndDate}`;
  }
  return customStartDate || customEndDate || translate("athleteTrendWindowCustom");
}

function toUtcDate(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getAthleteOperatingScore(record: CheckInRecord) {
  const readiness = getCompatibleReadinessState(record).gaugeValue * 20;
  const overall = (record.computed.ski ?? 0) * 20;
  return Math.round(readiness * 0.55 + overall * 0.45);
}

function getAthleteMomentum(assessments: CheckInRecord[]) {
  if (assessments.length < 2) {
    return { state: "steady" as const, delta: 0 };
  }

  const latestWindow = assessments.slice(-3);
  const previousSource = assessments.slice(0, -3);
  const previousWindow = previousSource.slice(-3);
  const latestAverage = averageScore(latestWindow.map((assessment) => assessment.computed.ski ?? getCompatibleReadinessState(assessment).gaugeValue));
  const previousAverage = averageScore((previousWindow.length ? previousWindow : previousSource).map((assessment) => assessment.computed.ski ?? getCompatibleReadinessState(assessment).gaugeValue));
  const delta = Number((latestAverage - previousAverage).toFixed(2));

  if (delta >= 0.35) return { state: "rising" as const, delta };
  if (delta <= -0.35) return { state: "falling" as const, delta };
  return { state: "steady" as const, delta };
}

function getAthleteOperatingActions(
  record: CheckInRecord,
  focusPillar: string,
  momentum: { state: "rising" | "steady" | "falling"; delta: number },
  translateAssessment: (key: string) => string,
  translateDashboard: (key: string, values?: Record<string, string | number>) => string
) {
  const readiness = getCompatibleReadinessState(record);
  const mode = getReadinessMode(readiness.count, readiness.total);

  const actions = [
    {
      title: translateDashboard(`athleteDailyActionModeTitle${capitalize(mode)}`),
      body: translateDashboard(`athleteDailyActionModeBody${capitalize(mode)}`)
    },
    {
      title: translateDashboard("athleteDailyActionFocusTitle"),
      body: translateDashboard("athleteDailyActionFocusBody", { focus: focusPillar })
    }
  ];

  if (momentum.state === "rising") {
    actions.push({
      title: translateDashboard("athleteDailyActionMomentumTitleRising"),
      body: translateDashboard("athleteDailyActionMomentumBodyRising", { delta: Math.abs(momentum.delta).toFixed(2) })
    });
  } else if (momentum.state === "falling") {
    actions.push({
      title: translateDashboard("athleteDailyActionMomentumTitleFalling"),
      body: translateDashboard("athleteDailyActionMomentumBodyFalling", { delta: Math.abs(momentum.delta).toFixed(2) })
    });
  } else {
    actions.push({
      title: translateDashboard("athleteDailyActionMomentumTitleSteady"),
      body: translateDashboard("athleteDailyActionMomentumBodySteady")
    });
  }

  if (readiness.count < readiness.total) {
    actions[0] = {
      title: translateDashboard("athleteDailyActionChecksTitle"),
      body: translateDashboard("athleteDailyActionChecksBody", {
        checks: readiness.count,
        total: readiness.total,
        mode: translateAssessment(`readinessMode${capitalize(mode)}`)
      })
    };
  }

  return actions.slice(0, 3);
}

function getReadinessModeBadgeColor(mode: string) {
  if (mode === "full") return "green";
  if (mode === "moderate") return "yellow";
  return "orange";
}

function getMomentumBadgeColor(state: "rising" | "steady" | "falling") {
  if (state === "rising") return "green";
  if (state === "falling") return "red";
  return "gray";
}

function averageScore(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function DeleteSurveyModal({
  opened,
  onClose,
  confirmValue,
  onConfirmValueChange,
  onDelete,
  deleting
}: {
  opened: boolean;
  onClose: () => void;
  confirmValue: string;
  onConfirmValueChange: (next: string) => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  const t = useTranslations("Assessment");
  const tc = useTranslations("Common");
  return (
    <Modal opened={opened} onClose={onClose} title={t("deleteSurveyTitle")} centered>
      <Stack gap="md">
        <Text size="sm">{t("deleteSurveyBody")}</Text>
        <Text size="sm" c="dimmed">{t("deleteSurveyConfirm")}</Text>
        <TextInput value={confirmValue} onChange={(e) => onConfirmValueChange(e.currentTarget.value)} placeholder={t("deleteKeyword")} />
        <Group justify="flex-end">
          <Button variant="subtle" onClick={onClose}>{tc("cancel")}</Button>
          <Button color="red" disabled={confirmValue.trim().toLowerCase() !== "delete" || deleting} loading={deleting} onClick={onDelete}>
            {t("deleteSurveyTitle")}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

function HistoryMetricCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <Paper withBorder p="md" radius="md">
      <Text size="sm" c="dimmed" fw={500} style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </Text>
      <Text size="xl" mt={4} fw={800} c={accent}>
        {value}
      </Text>
    </Paper>
  );
}
