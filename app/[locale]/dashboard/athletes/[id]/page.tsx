"use client";

import { useEffect, useMemo, useState, use } from "react";
import type { ReactNode } from "react";
import { Badge, Box, Checkbox, Group, Loader, Modal, Paper, SegmentedControl, SimpleGrid, Stack, Table, Text, TextInput } from "@mantine/core";
import Image from "next/image";
import { useTranslations } from "next-intl";
import {
  Badge as GdsBadge,
  Box as GdsBox,
  Checkbox as GdsCheckbox,
  createGdsVocabularyPack,
  GdsIcons,
  Group as GdsGroup,
  PageHeader,
  SectionPanel,
  SemanticButton,
  SimpleGrid as GdsSimpleGrid,
  Stack as GdsStack,
  StateBlock,
  TextInput as GdsTextInput
} from "@doneisbetter/gds/client";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { PdfService } from "@/lib/pdf-service";
import { getUsers } from "@/services/user-service";
import { withDisplayNamesForReport } from "@/lib/report-user-display";
import { LongitudinalChart } from "@/components/analytics/LongitudinalChart";
import { BenchmarkChart } from "@/components/analytics/BenchmarkChart";
import { SparklineChart } from "@/components/analytics/SparklineChart";
import { ReadinessGauge } from "@/components/analytics/ReadinessGauge";
import { athleteIqPillars, readinessChecklist, getReadinessMode } from "@/lib/readiness-model";
import { getAthleteEmptyStateAction } from "@/lib/empty-state";
import { athleteHabitDefinitions, createEmptyHabitStatuses, getHabitCategoryBreakdown, getHabitCompletion, getHabitScoreSummary, getHabitStreak, normalizeHabitStatuses, type HabitCategory } from "@/lib/athlete-habits";
import { getCompatiblePillarScore, getCompatibleReadinessState } from "@/lib/assessment-compat";
import { classifyDataConfidence } from "@/lib/data-confidence";
import { buildExplanation } from "@/lib/explainability";
import { ConfidenceBadge } from "@/components/insights/ConfidenceBadge";
import { ExplanationPanel } from "@/components/insights/ExplanationPanel";
import { runRecoverableJsonRequest } from "@/lib/request-recovery";
import type { CheckInRecord } from "@/types/check-in";
import type { AthleteHistoryPayload } from "@/types/athlete-history";
import type { HabitRecord } from "@/types/habit-record";
import type { SessionPlanRecord } from "@/types/session-plan";

type HabitPayload = {
  records: HabitRecord[];
};

type SessionPlanPayload = {
  plans: SessionPlanRecord[];
};

type MemoryEntry = {
  id: string;
  date: string;
  readiness: number;
  habitScore: number | null;
  strongest: string;
  focus: string;
  win: string;
  struggle: string;
  nextFocus: string;
  signals: string[];
};

type TrendWindow = "7d" | "30d" | "all" | "custom";
type TrendMetric = "readiness" | "movement" | "social" | "mental" | "ski";
type BaselineSaveState = "idle" | "saving" | "saved" | "error";

type BaselineDraft = {
  weeklyGoal: string;
  preferredTrainingDays: string[];
  supportPreferences: string[];
};

// The history route responds with a `{ success, data: { child, assessments, ... } }`
// envelope. Earlier code read the envelope as if it were the flat payload, so
// `historyPayload.child` was always undefined and the page rendered its error
// state. Unwrap defensively so both the enveloped and (legacy) flat shapes work.
function unwrapHistoryPayload(response: unknown): AthleteHistoryPayload | null {
  if (!response || typeof response !== "object") return null;
  const envelope = response as { data?: AthleteHistoryPayload };
  const payload = envelope.data ?? (response as AthleteHistoryPayload);
  return payload && payload.child ? payload : null;
}

const PILLAR_COLORS: Record<string, string> = {
  physical_pillar: "var(--mantine-color-tactical-6)",
  mental_pillar: "var(--mantine-color-synthesis-6)",
  sport_brain_pillar: "var(--mantine-color-strategy-6)"
};

const baselineTrainingDayOptions = [
  { value: "Monday", labelKey: "athleteBaselineMonday" },
  { value: "Tuesday", labelKey: "athleteBaselineTuesday" },
  { value: "Wednesday", labelKey: "athleteBaselineWednesday" },
  { value: "Thursday", labelKey: "athleteBaselineThursday" },
  { value: "Friday", labelKey: "athleteBaselineFriday" },
  { value: "Saturday", labelKey: "athleteBaselineSaturday" },
  { value: "Sunday", labelKey: "athleteBaselineSunday" }
];

const baselineSupportOptions = [
  { value: "Short feedback", labelKey: "athleteBaselineSupportShortFeedback" },
  { value: "Check-in reminders", labelKey: "athleteBaselineSupportReminders" },
  { value: "Recovery guidance", labelKey: "athleteBaselineSupportRecovery" },
  { value: "Training plan context", labelKey: "athleteBaselineSupportPlanning" }
];

// Function areas the athlete operating surface is segmented into.
type AthleteSection = "input" | "plan" | "analysis" | "records";

export default function AthleteHistoryPage({ params }: { params: Promise<{ id: string; locale: string }> }) {
  const { id } = use(params);
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("Assessment");
  const tc = useTranslations("Common");
  const td = useTranslations("Dashboard");
  const ts = useTranslations("Schema");
  const tr = useTranslations("Report");
  const emptyValue = tc("emptyValue");
  const isAthleteApp = pathname.includes("/athletes/") && !pathname.includes("/dashboard/athletes/");
  const emptyStateRole = isAthleteApp ? "athlete" : "trainer";

  const [data, setData] = useState<AthleteHistoryPayload | null>(null);
  // Captured once at mount: a stable "now" for freshness scoring, keeping the
  // render pure (no Date.now() during render) while still reflecting load time.
  const [nowMs] = useState(() => Date.now());
  // Function-area segmentation (#segment): the operating surface is split into
  // dedicated areas — Input (data entry), Plan, Analysis, Records — so each
  // function has its own focused view instead of one crammed scroll. Athletes
  // land on Input (today's actions); trainers land on Analysis.
  const [section, setSection] = useState<AthleteSection>(isAthleteApp ? "input" : "analysis");
  const [loading, setLoading] = useState(true);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deletingSurvey, setDeletingSurvey] = useState(false);
  const [habitRecords, setHabitRecords] = useState<HabitRecord[]>([]);
  const [sessionPlans, setSessionPlans] = useState<SessionPlanRecord[]>([]);
  const [savingHabits, setSavingHabits] = useState(false);
  const [habitSaveError, setHabitSaveError] = useState("");
  const [baselineDraft, setBaselineDraft] = useState<BaselineDraft>({
    weeklyGoal: "",
    preferredTrainingDays: [],
    supportPreferences: []
  });
  const [baselineSaveState, setBaselineSaveState] = useState<BaselineSaveState>("idle");
  const [baselineMessage, setBaselineMessage] = useState("");
  const athletesActionPack = useMemo(
    () =>
      createGdsVocabularyPack("athleteHistory", {
        view: {
          defaultMessage: tc("view"),
          icon: GdsIcons.Eye
        },
        download: {
          defaultMessage: tc("download"),
          icon: GdsIcons.Download
        }
      }),
    [tc]
  );
  const [trendWindow, setTrendWindow] = useState<TrendWindow>("30d");
  const [trendMetric, setTrendMetric] = useState<TrendMetric>("readiness");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [todayHabitStatuses, setTodayHabitStatuses] = useState<Record<string, boolean>>(createEmptyHabitStatuses());
  const todayDate = new Date().toISOString().slice(0, 10);
  const currentWeekStart = useMemo(() => getMonday(new Date()).toISOString().slice(0, 10), []);

  useEffect(() => {
    Promise.all([
      fetch(`/api/athletes/${id}/history`).then((res) => res.json()),
      fetch(`/api/athletes/${id}/habits`).then((res) => res.json()).catch(() => ({ records: [] })),
      fetch(`/api/session-plans?weekStart=${currentWeekStart}`).then((res) => res.json()).catch(() => ({ plans: [] }))
    ])
      .then(([historyResponse, habitPayload, sessionPlanPayload]: [unknown, HabitPayload, SessionPlanPayload]) => {
        const historyPayload = unwrapHistoryPayload(historyResponse);
        if (!historyPayload) {
          return;
        }
        setData(historyPayload);
        setBaselineDraft({
          weeklyGoal: historyPayload.child.baselineProfile?.weeklyGoal || "",
          preferredTrainingDays: historyPayload.child.baselineProfile?.preferredTrainingDays || [],
          supportPreferences: historyPayload.child.baselineProfile?.supportPreferences || []
        });
        setBaselineSaveState("idle");
        setBaselineMessage("");
        const nextHabitRecords = Array.isArray(habitPayload?.records) ? habitPayload.records : [];
        setHabitRecords(nextHabitRecords);
        setSessionPlans(Array.isArray(sessionPlanPayload?.plans) ? sessionPlanPayload.plans : []);
        const currentRecord = nextHabitRecords.find((record) => record.date === todayDate);
        setTodayHabitStatuses(currentRecord ? normalizeHabitStatuses(currentRecord.statuses) : createEmptyHabitStatuses());
      })
      .finally(() => setLoading(false));
  }, [currentWeekStart, id, todayDate]);

  async function downloadPdf() {
    if (!data || !latest) return;

    setDownloadingPdf(true);
    try {
      const users = await getUsers();
      const printableRecord = withDisplayNamesForReport(latest, users);
      await PdfService.generateMapReport(printableRecord, t, tc, ts, tr, data.assessments, habitRecords);
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

  async function saveTodayHabits() {
    setSavingHabits(true);
    setHabitSaveError("");
    const result = await runRecoverableJsonRequest<HabitRecord>({
      fallbackError: td("saveError"),
      request: () => fetch(`/api/athletes/${id}/habits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: todayDate,
          statuses: todayHabitStatuses
        })
      })
    });
    setSavingHabits(false);

    if (!result.ok) {
      setHabitSaveError(result.error);
      return;
    }

    const savedRecord = result.data;
    setHabitRecords((current) =>
      [...current.filter((record) => record.date !== savedRecord.date), savedRecord].sort((a, b) => a.date.localeCompare(b.date))
    );
  }

  async function retryTodayHabits() {
    await saveTodayHabits();
  }

  function toggleBaselineListValue(field: "preferredTrainingDays" | "supportPreferences", value: string, checked: boolean) {
    setBaselineDraft((current) => ({
      ...current,
      [field]: checked ? Array.from(new Set([...current[field], value])) : current[field].filter((item) => item !== value)
    }));
    setBaselineSaveState("idle");
    setBaselineMessage("");
  }

  async function saveBaselineSetup() {
    if (!data?.child._id) return;
    setBaselineSaveState("saving");
    setBaselineMessage("");

    const response = await fetch(`/api/athletes/${data.child._id}/baseline`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(baselineDraft)
    }).catch(() => null);

    if (!response?.ok) {
      setBaselineSaveState("error");
      setBaselineMessage(td("athleteBaselineSaveError"));
      return;
    }

    const payload = (await response.json().catch(() => null)) as { athlete?: AthleteHistoryPayload["child"] } | null;
    if (payload?.athlete) {
      setData((current) => current ? { ...current, child: payload.athlete! } : current);
    }
    setBaselineSaveState("saved");
    setBaselineMessage(td("athleteBaselineSaveSuccess"));
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
  const dailyOperatingMetrics = useMemo(
    () => (data?.dailyOperatingMetrics ?? []).slice().sort((a, b) => a.date.localeCompare(b.date)),
    [data]
  );
  const latest = chronologicalAssessments[chronologicalAssessments.length - 1] ?? null;
  const latestOperatingMetric = dailyOperatingMetrics[dailyOperatingMetrics.length - 1] ?? null;
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
      // pillarSeries always has one row per pillar (with 0s) even when the
      // selected window excludes every assessment; pass an empty array in that
      // case so the benchmark chart shows the empty state instead of zero bars
      // (matches the adjacent timelines). (#475 review)
      filteredAssessments.length === 0
        ? []
        : pillarSeries.map((pillar) => ({
            subject: pillar.translatedTitle,
            individual: pillar.current,
            average: pillar.baseline
          })),
    [filteredAssessments, pillarSeries]
  );

  const strongestPillar = useMemo(() => getStrongestPillar(pillarSeries, emptyValue), [emptyValue, pillarSeries]);
  const focusPillar = useMemo(() => getFocusPillar(pillarSeries, emptyValue), [emptyValue, pillarSeries]);
  const latestReadinessState = latest ? getCompatibleReadinessState(latest) : { count: 0, total: readinessChecklist.length, gaugeValue: 0 };
  const latestReadinessChecks = latestReadinessState.count;
  const latestReadinessTotal = latestReadinessState.total;
  const latestReadinessMode = getReadinessMode(latestReadinessChecks, latestReadinessTotal);
  const athleteOperatingScore = latestOperatingMetric?.athleteIqScore ?? (latest ? getAthleteOperatingScore(latest) : 0);
  const athleteMomentum = useMemo(() => getAthleteMomentum(chronologicalAssessments), [chronologicalAssessments]);
  const athleteOperatingActions = latest ? getAthleteOperatingActions(latest, focusPillar, athleteMomentum, t, td) : [];
  const habitHistory = useMemo(
    () => habitRecords.slice().sort((a, b) => a.date.localeCompare(b.date)),
    [habitRecords]
  );
  const latestHabitRecord = habitHistory[habitHistory.length - 1] ?? null;
  const habitCompletion = getHabitCompletion(todayHabitStatuses);
  const habitScoreSummary = getHabitScoreSummary(todayHabitStatuses);
  const habitStreak = getHabitStreak(habitHistory);
  const habitCategoryBreakdown = getHabitCategoryBreakdown(todayHabitStatuses);
  const habitTrendData = useMemo(
    () =>
      habitHistory.slice(-7).map((record) => ({
        date: record.date,
        value: getHabitScoreSummary(record.statuses).score / 20
      })),
    [habitHistory]
  );
  const strongestHabitCategory = getStrongestHabitCategory(habitCategoryBreakdown, td);
  const habitFocusCategory = getHabitFocusCategory(habitCategoryBreakdown, td);
  const habitRecordByDate = useMemo(
    () => new Map(habitHistory.map((record) => [record.date, record])),
    [habitHistory]
  );
  const memoryTimeline = useMemo(
    () => buildAthleteMemoryTimeline(chronologicalAssessments, habitRecordByDate, t, td, emptyValue),
    [chronologicalAssessments, habitRecordByDate, t, td, emptyValue]
  );
  const memorySummary = useMemo(
    () => summarizeMemoryTimeline(memoryTimeline, td, emptyValue),
    [memoryTimeline, td, emptyValue]
  );
  const loadTimeline = useMemo(
    () =>
      chronologicalAssessments
        .map((assessment) => ({
          date: assessment.session.date,
          value: getInternalLoad(assessment),
          externalLoad: assessment.trainingLoad.externalLoad ?? null,
          sessionType: assessment.trainingLoad.sessionType || ""
        }))
        .filter((entry) => entry.value !== null),
    [chronologicalAssessments]
  );
  const latestLoad = loadTimeline[loadTimeline.length - 1] ?? null;
  const latestThreeAverage = loadTimeline.length ? averageScore(loadTimeline.slice(-3).map((entry) => entry.value as number)) : 0;
  const previousThreeAverage = loadTimeline.length > 3 ? averageScore(loadTimeline.slice(-6, -3).map((entry) => entry.value as number)) : latestThreeAverage;
  const loadRatio = previousThreeAverage > 0 ? Number((latestThreeAverage / previousThreeAverage).toFixed(2)) : 1;
  const loadStatus = getLoadStatus(loadRatio);
  const checkedInToday = latest?.session.date === todayDate;
  const habitsCompleteToday = habitCompletion.completed === habitCompletion.total;
  const athleteLocation = latest?.session.location || data?.child.latestLocation || emptyValue;
  const relevantSessionPlan = selectRelevantSessionPlan(sessionPlans, data?.child.name || "", athleteLocation);
  const noRecordsAction = getAthleteEmptyStateAction({
    role: emptyStateRole,
    reason: "no_records",
    athleteId: data?.child._id
  });
  const startCheckInHref = isAthleteApp && data?.child._id ? `/athletes/${data.child._id}/check-in` : `/dashboard/assessment${data?.child._id ? `?childId=${data.child._id}` : ""}`;
  const emptyActionHref = isAthleteApp && data?.child._id ? `/athletes/${data.child._id}/check-in` : noRecordsAction?.href;
  const baselineSaved = Boolean(
    data?.child.baselineProfile?.onboardingCompletedAt ||
    data?.child.baselineProfile?.weeklyGoal ||
    data?.child.baselineProfile?.preferredTrainingDays?.length ||
    data?.child.baselineProfile?.supportPreferences?.length
  );

  // Trust + insight wiring (#253 data confidence, #254 explainability): both are
  // derived from real signals only, so the UI stays honest about how much it
  // actually knows and *why* it shows a given operating status. Computed inline —
  // the React compiler memoizes these pure derivations automatically.
  const dataConfidence = classifyDataConfidence({
    sampleSize: data?.assessments.length ?? 0,
    sourceCount: ((data?.assessments.length ?? 0) > 0 ? 1 : 0) + (habitRecords.length > 0 ? 1 : 0),
    lastUpdatedAt: latest?.session?.date ?? null,
    now: nowMs,
  });
  const readinessExplanation = buildExplanation({
    readinessScore: athleteOperatingScore,
    missingSignalCount: Math.max(0, latestReadinessTotal - latestReadinessChecks),
    injuryRisk: loadRatio > 1.3 ? "high" : "normal",
  });

  const sectionOptions = [
    { value: "input", label: td("sectionInput") },
    { value: "plan", label: td("sectionPlan") },
    { value: "analysis", label: td("sectionAnalysis") },
    { value: "records", label: td("sectionRecords") }
  ];

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
            {isAthleteApp ? (
              <Link href={startCheckInHref} style={{ textDecoration: "none" }}>
                <SemanticButton action="start" color="ingress" />
              </Link>
            ) : (
              <>
                <Link href={latest?._id ? `/dashboard/assessment?id=${latest._id}` : "/dashboard/assessment"} style={{ textDecoration: "none" }}>
                  <SemanticButton action="edit" variant="default" disabled={data.assessments.length === 0} />
                </Link>
                <SemanticButton action="download" color="ingress" onClick={() => void downloadPdf()} loading={downloadingPdf} disabled={data.assessments.length === 0}>{td("exportReportPdf")}</SemanticButton>
                <SemanticButton action="delete" color="red" onClick={() => setDeleteModalOpen(true)} disabled={data.assessments.length === 0} />
              </>
            )}
          </Group>
        }
      />

      {data.assessments.length > 0 ? (
        <SectionPanel title={td("insightTitle")}>
          <Stack gap="md">
            <Group gap="sm" wrap="wrap" align="center">
              <Text size="sm" c="dimmed">
                {td("dataConfidenceLabel")}
              </Text>
              <ConfidenceBadge band={dataConfidence.band} reasonKeys={dataConfidence.reasonKeys} />
            </Group>
            <ExplanationPanel bundle={readinessExplanation} title={td("whyThisStatus")} />
          </Stack>
        </SectionPanel>
      ) : null}

      {isAthleteApp ? (
        <AthleteBaselineSetupSection
          draft={baselineDraft}
          message={baselineMessage}
          saved={baselineSaved}
          saveState={baselineSaveState}
          translate={td}
          onGoalChange={(weeklyGoal) => {
            setBaselineDraft((current) => ({ ...current, weeklyGoal }));
            setBaselineSaveState("idle");
            setBaselineMessage("");
          }}
          onToggleDay={(value, checked) => toggleBaselineListValue("preferredTrainingDays", value, checked)}
          onToggleSupport={(value, checked) => toggleBaselineListValue("supportPreferences", value, checked)}
          onSave={() => void saveBaselineSetup()}
        />
      ) : null}

      {data.assessments.length === 0 ? (
        <SectionPanel title={td("athleteHistoryEmptyTitle")} description={td("athleteHistoryEmptySubtitle")}>
          <StateBlock
            variant="empty"
            title={td("athleteHistoryEmptyTitle")}
            description={t("noHistory")}
            action={emptyActionHref ? (
              <Link href={emptyActionHref} style={{ textDecoration: "none" }}>
                <SemanticButton action="start" color="ingress" />
              </Link>
            ) : null}
          />
        </SectionPanel>
      ) : (
        <>
          <Box>
            <SegmentedControl
              value={section}
              onChange={(value) => setSection(value as AthleteSection)}
              data={sectionOptions}
              fullWidth
              aria-label={td("sectionNavLabel")}
            />
          </Box>

          {section === "input" && isAthleteApp ? (
            <SectionPanel title={td("athleteTodayTasksTitle")} description={td("athleteTodayTasksSubtitle")}>
              <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                <Paper withBorder p="md" radius="md">
                  <Stack gap="sm">
                    <Group justify="space-between" align="flex-start">
                      <Box>
                        <Text fw={700}>{td("athleteTodayCheckInTaskTitle")}</Text>
                        <Text size="sm" c="dimmed">
                          {checkedInToday ? td("athleteTodayCheckInDone") : td("athleteTodayCheckInOpen")}
                        </Text>
                      </Box>
                      <Badge color={checkedInToday ? "green" : "red"}>
                        {checkedInToday ? td("athleteTaskDoneBadge") : td("athleteTaskOpenBadge")}
                      </Badge>
                    </Group>
                    <Link href={startCheckInHref} style={{ textDecoration: "none" }}>
                      <SemanticButton action={checkedInToday ? "edit" : "start"} color="ingress" fullWidth />
                    </Link>
                  </Stack>
                </Paper>

                <Paper withBorder p="md" radius="md">
                  <Stack gap="sm">
                    <Group justify="space-between" align="flex-start">
                      <Box>
                        <Text fw={700}>{td("athleteTodayHabitsTaskTitle")}</Text>
                        <Text size="sm" c="dimmed">
                          {td("athleteTodayHabitsProgress", {
                            completed: habitCompletion.completed,
                            total: habitCompletion.total
                          })}
                        </Text>
                      </Box>
                      <Badge color={habitsCompleteToday ? "green" : "yellow"}>
                        {habitsCompleteToday ? td("athleteTaskDoneBadge") : td("athleteTaskOpenBadge")}
                      </Badge>
                    </Group>
                    <Text size="sm" c="dimmed">{td("athleteTodayHabitsHint")}</Text>
                  </Stack>
                </Paper>
              </SimpleGrid>
            </SectionPanel>
          ) : null}

          {section === "analysis" ? (
          <SectionPanel
            title={td("athleteDailyOperatingTitle")}
            description={td("athleteDailyOperatingSubtitle")}
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
              {habitSaveError ? (
                <Paper withBorder p="md" radius="md">
                  <Group justify="space-between" align="center">
                    <Text size="sm" c="red">{habitSaveError}</Text>
                    <SemanticButton action="refresh" variant="light" size="sm" onClick={() => void retryTodayHabits()} loading={savingHabits} />
                  </Group>
                </Paper>
              ) : null}
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
          </SectionPanel>
          ) : null}

          {section === "plan" ? (
          <SectionPanel
            title={td("athletePlanTitle")}
            description={td("athletePlanSubtitle")}
            action={!isAthleteApp ? (
              <Link href="/dashboard/planning" style={{ textDecoration: "none" }}>
                <SemanticButton action="launch" variant="light" size="sm" />
              </Link>
            ) : undefined}
          >
            {relevantSessionPlan ? (
              <Stack gap="md">
                <Paper withBorder p="md" radius="md">
                  <Stack gap="xs">
                    <Text fw={700}>{td("athletePlanSummaryTitle")}</Text>
                    <Text c="dimmed">
                      {td("athletePlanSummaryBody", {
                        scope: relevantSessionPlan.scope === "all" ? td("planningScopeAll") : relevantSessionPlan.scope,
                        actor: relevantSessionPlan.actorName,
                        updatedAt: relevantSessionPlan.updatedAt.slice(0, 10)
                      })}
                    </Text>
                  </Stack>
                </Paper>

                <SimpleGrid cols={{ base: 1, md: 2, xl: 5 }} spacing="md">
                  {relevantSessionPlan.days.map((day) => {
                    const isPriorityAthlete = day.athleteNames.includes(data.child.name);
                    return (
                      <Paper key={day.isoDate} withBorder p="md" radius="md">
                        <Stack gap="sm">
                          <Group justify="space-between" align="flex-start">
                            <Box>
                              <Text fw={700}>{day.isoDate}</Text>
                              <Text size="sm" c="dimmed">{td(`sessionBlueprint${capitalize(day.variant)}Label`)}</Text>
                            </Box>
                            <Badge color={getPlanVariantBadgeColor(day.variant)}>
                              {td(`sessionBlueprint${capitalize(day.variant)}Badge`)}
                            </Badge>
                          </Group>

                          <Box>
                            <Text size="sm" fw={600}>{td("planningDayFocusLabel")}</Text>
                            <Text size="sm" c="dimmed">{day.focus}</Text>
                          </Box>

                          <Box>
                            <Text size="sm" fw={600}>{td("planningDayLoadLabel")}</Text>
                            <Text size="sm" c="dimmed">{day.loadTarget}</Text>
                          </Box>

                          <Box>
                            <Text size="sm" fw={600}>{td("planningDayCoachLabel")}</Text>
                            <Text size="sm" c="dimmed">{day.coachNote}</Text>
                          </Box>

                          {isPriorityAthlete ? (
                            <Badge variant="light" color="ingress">
                              {td("athletePlanPriorityBadge")}
                            </Badge>
                          ) : null}
                        </Stack>
                      </Paper>
                    );
                  })}
                </SimpleGrid>
              </Stack>
            ) : (
              <Text c="dimmed">{td("athletePlanEmpty")}</Text>
            )}
          </SectionPanel>
          ) : null}

          {section === "input" ? (
          <SectionPanel
            title={td("athleteHabitTrackerTitle")}
            description={td("athleteHabitTrackerSubtitle")}
            action={
              <SemanticButton action="save" color="ingress" onClick={() => void saveTodayHabits()} loading={savingHabits} />
            }
          >
            <Stack gap="md">
              <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
                <HistoryMetricCard label={td("athleteHabitScoreLabel")} value={`${habitScoreSummary.score}`} accent="ingress" />
                <HistoryMetricCard label={td("athleteHabitCompletedLabel")} value={`${habitCompletion.completed}/${habitCompletion.total}`} accent="strategy" />
                <HistoryMetricCard label={td("athleteHabitStreakLabel")} value={`${habitStreak}`} accent="knowmore" />
                <HistoryMetricCard label={td("athleteHabitFocusLabel")} value={habitFocusCategory} accent="review" />
              </SimpleGrid>

              <Paper withBorder p="md" radius="md">
                <Stack gap="xs">
                  <Text fw={700}>{td("athleteHabitSummaryTitle")}</Text>
                  <Text c="dimmed">
                    {td("athleteHabitSummaryBody", {
                      score: habitScoreSummary.score,
                      streak: habitStreak,
                      strongest: strongestHabitCategory,
                      focus: habitFocusCategory
                    })}
                  </Text>
                </Stack>
              </Paper>

              <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
                <Stack gap="md">
                  {(["training", "learning", "recovery", "wellness"] as HabitCategory[]).map((category) => (
                    <Paper key={category} withBorder p="md" radius="md">
                      <Stack gap="sm">
                        <Group justify="space-between" align="flex-start">
                          <div>
                            <Text fw={700}>{td(`athleteHabitCategory${capitalize(category)}`)}</Text>
                            <Text size="sm" c="dimmed">
                              {td("athleteHabitCategorySummary", {
                                completed: habitCategoryBreakdown[category].completed,
                                total: habitCategoryBreakdown[category].total
                              })}
                            </Text>
                          </div>
                        </Group>
                        <Stack gap={8}>
                          {athleteHabitDefinitions
                            .filter((habit) => habit.category === category)
                            .map((habit) => (
                              <Checkbox
                                key={habit.key}
                                checked={todayHabitStatuses[habit.key]}
                                onChange={(event) =>
                                  setTodayHabitStatuses((current) => ({
                                    ...current,
                                    [habit.key]: event.currentTarget.checked
                                  }))
                                }
                                label={td(habit.titleKey)}
                              />
                            ))}
                        </Stack>
                      </Stack>
                    </Paper>
                  ))}
                </Stack>

                <Stack gap="md">
                  <LongitudinalChart
                    title={td("athleteHabitTrendTitle")}
                    data={habitTrendData}
                    emptyLabel={td("chartNoData")}
                    color="var(--mantine-color-ingress-6)"
                    yDomain={[0, 5]}
                  />
                  <Text size="sm" c="dimmed">
                    {td("athleteHabitTrendInsight", {
                      days: habitTrendData.length,
                      latest: latestHabitRecord ? getHabitScoreSummary(latestHabitRecord.statuses).score : 0
                    })}
                  </Text>
                </Stack>
              </SimpleGrid>
            </Stack>
          </SectionPanel>
          ) : null}

          {section === "analysis" ? (
          <>
          <SectionPanel
            title={td("athleteMemoryTitle")}
            description={td("athleteMemorySubtitle")}
          >
            <Stack gap="md">
              <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
                <HistoryMetricCard label={td("athleteMemoryEntriesLabel")} value={`${memoryTimeline.length}`} accent="ingress" />
                <HistoryMetricCard label={td("athleteMemoryTrendLabel")} value={memorySummary.pattern} accent="knowmore" />
                <HistoryMetricCard label={td("athleteMemoryConstraintLabel")} value={memorySummary.constraint} accent="review" />
                <HistoryMetricCard label={td("athleteMemorySupportLabel")} value={memorySummary.support} accent="strategy" />
              </SimpleGrid>

              <Paper withBorder p="md" radius="md">
                <Stack gap="xs">
                  <Text fw={700}>{td("athleteMemorySummaryTitle")}</Text>
                  <Text c="dimmed">
                    {td("athleteMemorySummaryBody", {
                      pattern: memorySummary.pattern,
                      strongest: memorySummary.strongest,
                      support: memorySummary.support
                    })}
                  </Text>
                </Stack>
              </Paper>

              <SimpleGrid cols={{ base: 1, xl: 2 }} spacing="lg">
                <Paper withBorder p="md" radius="md">
                  <Stack gap="sm">
                    <Text fw={700}>{td("athleteMemoryPatternsTitle")}</Text>
                    {memorySummary.signals.length === 0 ? (
                      <Text size="sm" c="dimmed">{td("athleteMemoryEmpty")}</Text>
                    ) : (
                      memorySummary.signals.map((signal) => (
                        <Text key={signal} size="sm">{signal}</Text>
                      ))
                    )}
                  </Stack>
                </Paper>

                <Stack gap="md">
                  {memoryTimeline.slice(-4).reverse().map((entry) => (
                    <Paper key={entry.id} withBorder p="md" radius="md">
                      <Stack gap={6}>
                        <Group justify="space-between" align="flex-start">
                          <Box>
                            <Text fw={700}>{entry.date}</Text>
                            <Text size="sm" c="dimmed">
                              {td("athleteMemoryByline", {
                                readiness: entry.readiness.toFixed(1),
                                habit: entry.habitScore ?? 0
                              })}
                            </Text>
                          </Box>
                          <Badge variant="light" color="ingress">
                            {entry.focus}
                          </Badge>
                        </Group>
                        <Text size="sm">
                          {td("athleteMemoryWinBody", { win: entry.win })}
                        </Text>
                        <Text size="sm" c="dimmed">
                          {td("athleteMemoryStruggleBody", { struggle: entry.struggle })}
                        </Text>
                        <Text size="sm" c="dimmed">
                          {td("athleteMemoryFocusBody", { focus: entry.nextFocus })}
                        </Text>
                        {entry.signals.length > 0 ? (
                          <Stack gap={4} mt={4}>
                            {entry.signals.map((signal) => (
                              <Text key={`${entry.id}-${signal}`} size="sm" c="dimmed">
                                {signal}
                              </Text>
                            ))}
                          </Stack>
                        ) : null}
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              </SimpleGrid>
            </Stack>
          </SectionPanel>

          <SectionPanel
            title={td("athleteLoadTitle")}
            description={td("athleteLoadSubtitle")}
          >
            {loadTimeline.length === 0 ? (
              <StateBlock
                variant="empty"
                title={td("athleteLoadTitle")}
                description={td("athleteLoadEmpty")}
                action={emptyActionHref ? (
                  <Link href={emptyActionHref} style={{ textDecoration: "none" }}>
                    <SemanticButton action="start" color="ingress" />
                  </Link>
                ) : null}
              />
            ) : (
              <Stack gap="md">
                <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
                  <HistoryMetricCard label={td("athleteLoadLatestLabel")} value={latestLoad ? `${latestLoad.value}` : "-"} accent="ingress" />
                  <HistoryMetricCard label={td("athleteLoadShortAverageLabel")} value={latestThreeAverage ? latestThreeAverage.toFixed(0) : "-"} accent="strategy" />
                  <HistoryMetricCard label={td("athleteLoadRatioLabel")} value={loadRatio.toFixed(2)} accent={loadRatio > 1.15 ? "review" : "knowmore"} />
                  <HistoryMetricCard label={td("athleteLoadStatusLabel")} value={td(`athleteLoadStatus${capitalize(loadStatus)}`)} accent="review" />
                </SimpleGrid>

                <LongitudinalChart
                  title={td("athleteLoadTrendTitle")}
                  data={loadTimeline.map((entry) => ({ date: entry.date, value: entry.value as number }))}
                  emptyLabel={td("chartNoData")}
                  color="var(--mantine-color-review-6)"
                  yDomain={[0, Math.max(...loadTimeline.map((entry) => entry.value as number), 100)]}
                />

                <Text size="sm" c="dimmed">
                  {td("athleteLoadInsight", {
                    latest: latestLoad?.value ?? 0,
                    ratio: loadRatio.toFixed(2),
                    status: td(`athleteLoadStatus${capitalize(loadStatus)}`)
                  })}
                </Text>
              </Stack>
            )}
          </SectionPanel>

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

          <SectionPanel title={td("athleteTrendExplorerTitle")} description={td("athleteTrendExplorerSubtitle")}>
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
                    emptyLabel={td("chartNoData")}
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
          </SectionPanel>

          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
            <SectionPanel title={td("athleteSessionProfileTitle")} description={td("athleteSessionProfileSubtitle")}>
              <BenchmarkChart
                title={td("athleteLatestVsBaselineTitle")}
                data={benchmarkData}
                emptyLabel={td("chartNoData")}
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
            </SectionPanel>

            <SectionPanel title={td("athleteReadinessTitle")} description={td("athleteReadinessSubtitle")}>
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
                  emptyLabel={td("chartNoData")}
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
            </SectionPanel>
          </SimpleGrid>

          <SectionPanel
            title={td("athletePillarEvolutionTitle")}
            description={td("athletePillarEvolutionSubtitle", { range: trendWindowSummary })}
          >
            <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
              {pillarSeries.map((pillar) => (
                <LongitudinalChart
                  key={pillar.key}
                  title={pillar.translatedTitle}
                  data={pillar.trend}
                  emptyLabel={td("chartNoData")}
                  color={PILLAR_COLORS[pillar.key]}
                />
              ))}
            </SimpleGrid>
          </SectionPanel>
          </>
          ) : null}

          {section === "records" ? (
          <>
          <SectionPanel title={td("athleteSessionLogTitle")} description={td("athleteSessionLogSubtitle")}>
            <Stack gap="md" hiddenFrom="sm">
              {data.assessments.map((assessment) => {
                const profile = getSessionProfile(assessment, t, emptyValue);
                return (
                  <ResponsiveDataCard
                    key={assessment._id}
                    onClick={!isAthleteApp ? () => router.push(`/dashboard/records/${assessment._id}`) : undefined}
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
                        onClick={!isAthleteApp ? () => router.push(`/dashboard/records/${assessment._id}`) : undefined}
                        style={{ cursor: !isAthleteApp ? "pointer" : undefined }}
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
          </SectionPanel>

          <SectionPanel title={t("evidenceImages")}>
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
                  <a
                    href={attachment.url}
                    target="_blank"
                    rel="noreferrer"
                    {...(isPdf ? { download: attachment.name || t("reportFileName") } : {})}
                    style={{ textDecoration: "none", display: "block" }}
                  >
                    <SemanticButton
                      action={isPdf ? "athleteHistory:download" : "athleteHistory:view"}
                      variant="light"
                      size="sm"
                      style={{ marginTop: 8 }}
                      fullWidth
                      vocabularyPacks={[athletesActionPack]}
                    />
                  </a>
                </Paper>
              );
            })}
                      </SimpleGrid>
                    </Paper>
                  ))}
              </Stack>
            )}
          </SectionPanel>
          </>
          ) : null}
        </>
      )}

      {!isAthleteApp ? (
        <DeleteSurveyModal
          opened={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          confirmValue={deleteConfirmText}
          onConfirmValueChange={setDeleteConfirmText}
          onDelete={() => void deleteLatestSurvey()}
          deleting={deletingSurvey}
        />
      ) : null}
    </Stack>
  );
}

function AthleteBaselineSetupSection({
  draft,
  message,
  saved,
  saveState,
  translate,
  onGoalChange,
  onToggleDay,
  onToggleSupport,
  onSave
}: {
  draft: BaselineDraft;
  message: string;
  saved: boolean;
  saveState: BaselineSaveState;
  translate: (key: string) => string;
  onGoalChange: (value: string) => void;
  onToggleDay: (value: string, checked: boolean) => void;
  onToggleSupport: (value: string, checked: boolean) => void;
  onSave: () => void;
}) {
  const canSave = Boolean(draft.weeklyGoal.trim() || draft.preferredTrainingDays.length || draft.supportPreferences.length);
  const messageTone = saveState === "error" ? "var(--status-error)" : "var(--status-success)";

  return (
    <SectionPanel
      title={translate("athleteBaselineSetupTitle")}
      description={translate("athleteBaselineSetupSubtitle")}
      action={
        <GdsBadge color={saved ? "green" : "yellow"}>
          {saved ? translate("athleteBaselineSavedBadge") : translate("athleteBaselineOpenBadge")}
        </GdsBadge>
      }
    >
      <GdsStack gap="md">
        {message ? (
          <GdsBox
            role={saveState === "error" ? "alert" : "status"}
            p="sm"
            style={{
              border: "1px solid var(--border-primary)",
              borderRadius: "var(--mantine-radius-sm)",
              color: messageTone
            }}
          >
            {message}
          </GdsBox>
        ) : null}

        <GdsTextInput
          label={translate("athleteBaselineGoalLabel")}
          placeholder={translate("athleteBaselineGoalPlaceholder")}
          value={draft.weeklyGoal}
          onChange={(event) => onGoalChange(event.currentTarget.value)}
        />

        <GdsBox>
          <p style={{ marginBlock: 0, fontWeight: 700 }}>{translate("athleteBaselineDaysLabel")}</p>
          <GdsSimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="xs" mt="xs">
            {baselineTrainingDayOptions.map((option) => (
              <GdsCheckbox
                key={option.value}
                checked={draft.preferredTrainingDays.includes(option.value)}
                label={translate(option.labelKey)}
                onChange={(event) => onToggleDay(option.value, event.currentTarget.checked)}
              />
            ))}
          </GdsSimpleGrid>
        </GdsBox>

        <GdsBox>
          <p style={{ marginBlock: 0, fontWeight: 700 }}>{translate("athleteBaselineSupportLabel")}</p>
          <GdsSimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs" mt="xs">
            {baselineSupportOptions.map((option) => (
              <GdsCheckbox
                key={option.value}
                checked={draft.supportPreferences.includes(option.value)}
                label={translate(option.labelKey)}
                onChange={(event) => onToggleSupport(option.value, event.currentTarget.checked)}
              />
            ))}
          </GdsSimpleGrid>
        </GdsBox>

        <GdsGroup justify="flex-end">
          <SemanticButton action="save" color="ingress" onClick={onSave} loading={saveState === "saving"} disabled={!canSave} />
        </GdsGroup>
      </GdsStack>
    </SectionPanel>
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

function getInternalLoad(record: CheckInRecord) {
  const duration = record.trainingLoad.durationMinutes;
  const rpe = record.trainingLoad.rpe;
  if (typeof duration !== "number" || typeof rpe !== "number") return null;
  return Math.round(duration * rpe);
}

function getLoadStatus(ratio: number) {
  if (ratio >= 1.3) return "heavy";
  if (ratio <= 0.8) return "light";
  return "balanced";
}

function getMonday(date: Date) {
  const monday = new Date(date);
  const day = monday.getDay();
  const distance = day === 0 ? -6 : 1 - day;
  monday.setDate(monday.getDate() + distance);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function selectRelevantSessionPlan(plans: SessionPlanRecord[], athleteName: string, athleteLocation: string) {
  const exactLocation = plans.find((plan) => plan.scope === athleteLocation);
  if (exactLocation) return exactLocation;

  const namedPlan = plans.find((plan) => plan.days.some((day) => day.athleteNames.includes(athleteName)));
  if (namedPlan) return namedPlan;

  return plans.find((plan) => plan.scope === "all") ?? null;
}

function getPlanVariantBadgeColor(variant: "standard" | "controlled" | "recovery") {
  return variant === "recovery" ? "red" : variant === "controlled" ? "yellow" : "green";
}

function buildAthleteMemoryTimeline(
  assessments: CheckInRecord[],
  habitRecordByDate: Map<string, HabitRecord>,
  translateAssessment: (key: string) => string,
  translateDashboard: (key: string, values?: Record<string, string | number>) => string,
  emptyValue: string
) {
  return assessments.map((assessment) => {
    const habitRecord = habitRecordByDate.get(assessment.session.date);
    const readiness = getCompatibleReadinessState(assessment).gaugeValue;
    const strongest = getStrongestPillar(
      athleteIqPillars.map((pillar) => ({
        translatedTitle: translateAssessment(pillar.title),
        current: getCompatiblePillarScore(assessment, pillar.key)
      })),
      emptyValue
    );
    const focus = getFocusPillar(
      athleteIqPillars.map((pillar) => ({
        translatedTitle: translateAssessment(pillar.title),
        current: getCompatiblePillarScore(assessment, pillar.key)
      })),
      emptyValue
    );
    const habitScore = habitRecord ? getHabitScoreSummary(habitRecord.statuses).score : null;
    const generalNote = assessment.notes.general.trim();
    const adaptationsNote = assessment.notes.adaptations.trim();
    const referralNote = assessment.notes.referral.trim();

    return {
      id: assessment._id || assessment.session.date,
      date: assessment.session.date,
      readiness,
      habitScore,
      strongest,
      focus,
      win: generalNote || translateDashboard("athleteMemoryFallbackWin", { strongest }),
      struggle: adaptationsNote || translateDashboard("athleteMemoryFallbackStruggle", { focus }),
      nextFocus: referralNote || focus,
      signals: buildMemorySignals({
        readiness,
        habitScore,
        strongest,
        focus,
        translateDashboard
      })
    } satisfies MemoryEntry;
  });
}

function buildMemorySignals({
  readiness,
  habitScore,
  strongest,
  focus,
  translateDashboard
}: {
  readiness: number;
  habitScore: number | null;
  strongest: string;
  focus: string;
  translateDashboard: (key: string, values?: Record<string, string | number>) => string;
}) {
  const signals: string[] = [];
  if (readiness < 3) {
    signals.push(translateDashboard("athleteMemorySignalLowReadiness"));
  } else if (readiness >= 4) {
    signals.push(translateDashboard("athleteMemorySignalHighReadiness"));
  }

  if (habitScore !== null && habitScore < 60) {
    signals.push(translateDashboard("athleteMemorySignalHabitSlip"));
  } else if (habitScore !== null && habitScore >= 80) {
    signals.push(translateDashboard("athleteMemorySignalHabitStrong"));
  }

  signals.push(translateDashboard("athleteMemorySignalSupportArea", { focus }));
  signals.push(translateDashboard("athleteMemorySignalStrengthArea", { strongest }));
  return Array.from(new Set(signals)).slice(0, 4);
}

function summarizeMemoryTimeline(
  memoryTimeline: MemoryEntry[],
  translateDashboard: (key: string, values?: Record<string, string | number>) => string,
  emptyValue: string
) {
  if (memoryTimeline.length === 0) {
    return {
      pattern: emptyValue,
      strongest: emptyValue,
      support: emptyValue,
      constraint: emptyValue,
      signals: [] as string[]
    };
  }

  const latest = memoryTimeline[memoryTimeline.length - 1];
  const previous = memoryTimeline.slice(-3, -1);
  const previousAverage = previous.length
    ? averageScore(previous.map((entry) => entry.readiness))
    : latest.readiness;

  const pattern =
    latest.readiness - previousAverage >= 0.35
      ? translateDashboard("athleteMemoryPatternRising")
      : previousAverage - latest.readiness >= 0.35
        ? translateDashboard("athleteMemoryPatternFalling")
        : translateDashboard("athleteMemoryPatternSteady");

  const supportFrequency = new Map<string, number>();
  const strongestFrequency = new Map<string, number>();
  for (const entry of memoryTimeline.slice(-5)) {
    supportFrequency.set(entry.focus, (supportFrequency.get(entry.focus) ?? 0) + 1);
    strongestFrequency.set(entry.strongest, (strongestFrequency.get(entry.strongest) ?? 0) + 1);
  }

  const support = [...supportFrequency.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? emptyValue;
  const strongest = [...strongestFrequency.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? emptyValue;
  const constraint = latest.habitScore !== null && latest.habitScore < 60
    ? translateDashboard("athleteMemoryConstraintHabits")
    : latest.readiness < 3
      ? translateDashboard("athleteMemoryConstraintReadiness")
      : support;

  return {
    pattern,
    strongest,
    support,
    constraint,
    signals: memoryTimeline.slice(-3).flatMap((entry) => entry.signals).filter((signal, index, source) => source.indexOf(signal) === index).slice(0, 4)
  };
}

function getStrongestHabitCategory(
  breakdown: Record<HabitCategory, { completed: number; total: number }>,
  translateDashboard: (key: string) => string
) {
  const best = (Object.entries(breakdown) as Array<[HabitCategory, { completed: number; total: number }]>)
    .sort((a, b) => {
      const aScore = a[1].total ? a[1].completed / a[1].total : 0;
      const bScore = b[1].total ? b[1].completed / b[1].total : 0;
      return bScore - aScore;
    })[0]?.[0];
  return best ? translateDashboard(`athleteHabitCategory${capitalize(best)}`) : "-";
}

function getHabitFocusCategory(
  breakdown: Record<HabitCategory, { completed: number; total: number }>,
  translateDashboard: (key: string) => string
) {
  const focus = (Object.entries(breakdown) as Array<[HabitCategory, { completed: number; total: number }]>)
    .sort((a, b) => {
      const aScore = a[1].total ? a[1].completed / a[1].total : 0;
      const bScore = b[1].total ? b[1].completed / b[1].total : 0;
      return aScore - bScore;
    })[0]?.[0];
  return focus ? translateDashboard(`athleteHabitCategory${capitalize(focus)}`) : "-";
}

function ResponsiveDataCard({ title, children, onClick }: { title: string; children: ReactNode; onClick?: () => void }) {
  return (
    <Box style={{ width: "100%", cursor: onClick ? "pointer" : undefined }} onClick={onClick}>
      <SectionPanel title={title}>
        <Stack gap="md">{children}</Stack>
      </SectionPanel>
    </Box>
  );
}

function ResponsiveDataRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Stack gap={4}>
      <Text size="sm" fw={700} c="var(--text-secondary)" style={{ textTransform: "uppercase", letterSpacing: "0.04em" }}>
        {label}
      </Text>
      <Box style={{ width: "100%", minWidth: 0 }}>{value}</Box>
    </Stack>
  );
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
  return (
    <Modal opened={opened} onClose={onClose} title={t("deleteSurveyTitle")} centered>
      <Stack gap="md">
        <Text size="sm">{t("deleteSurveyBody")}</Text>
        <Text size="sm" c="dimmed">{t("deleteSurveyConfirm")}</Text>
        <TextInput value={confirmValue} onChange={(e) => onConfirmValueChange(e.currentTarget.value)} placeholder={t("deleteKeyword")} />
        <Group justify="flex-end">
          <SemanticButton action="cancel" variant="subtle" onClick={onClose} />
          <SemanticButton action="delete" color="red" disabled={confirmValue.trim().toLowerCase() !== "delete"} loading={deleting} onClick={onDelete} />
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
