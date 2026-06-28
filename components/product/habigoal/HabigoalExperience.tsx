"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { Alert, Box, Group, Paper, Progress, SimpleGrid, Slider, Stack, Text, Title } from "@mantine/core";
import { GdsIcons } from "@doneisbetter/gds/client";
import { useTranslations } from "next-intl";
import { useState, type CSSProperties } from "react";
import type { ProductSurface } from "@/lib/product-surfaces";
import type { HabigoalDailyStatus } from "@/lib/habigoal-status";
import type { HabigoalHabitKey, HabigoalHistory, HabigoalTodayProjection } from "@/services/habigoal-product.service";
import { SectionHeading, SignalCard, SurfaceTopBar, type SurfaceSignalState } from "../ProductSurfaceShared";

type HabitItem = {
  id: HabigoalHabitKey;
  dbKey: string;
  category: string;
};

type MetricDraft = HabigoalTodayProjection["values"];
type FeedbackState = {
  correlationId?: string;
  kind: "error" | "success";
  messageKey: string;
};
type HabigoalView = "flow" | "progress";
type WizardStep = "checkin" | "habits" | "review";

const WIZARD_STEPS: WizardStep[] = ["checkin", "habits", "review"];

const HABIT_PLAN = [
  { id: "hydrate", dbKey: "hydration", category: "recovery" },
  { id: "move", dbKey: "mobility", category: "sport" },
  { id: "fuel", dbKey: "nutrition", category: "fuel" },
  { id: "reflect", dbKey: "recoverySession", category: "mental" },
  { id: "sleep", dbKey: "sleepBeforeMidnight", category: "recovery" },
  { id: "study", dbKey: "tacticalLearning", category: "life" }
] satisfies HabitItem[];

// Stepped slider stops: coarse enough that a value cannot be nudged by accident
// while scrolling, with visible marks so the control reads as discrete stages.
const SLIDER_STEP = 10;
const SLIDER_MARKS = [0, 20, 40, 60, 80, 100].map((value) => ({ value }));

type Translate = ReturnType<typeof useTranslations>;

type DailyWizardProps = {
  canSave: boolean;
  completedHabits: HabigoalHabitKey[];
  draftValues: MetricDraft;
  habitScore: number;
  hasCompleteDraft: boolean;
  onBack: () => void;
  onContinue: () => void;
  onContinueHabits: () => void;
  onSave: () => void;
  onSetMetric: (key: keyof MetricDraft, value: number) => void;
  onToggleHabit: (id: HabigoalHabitKey) => void;
  saving: boolean;
  step: WizardStep;
  stepIndex: number;
  translate: Translate;
};

type ResultPanelProps = {
  completed: number;
  habitTotal: number;
  nextAction: string;
  onUpdate: () => void;
  onViewProgress: () => void;
  reasons: string[];
  reasonsTitle: string;
  score: number;
  scoreAria: string;
  scoreText: string;
  state: SurfaceSignalState;
  statusLabel: string;
  translate: Translate;
};

export function HabigoalExperience({ history, projection, surface }: { history?: HabigoalHistory; projection: HabigoalTodayProjection; relatedSurface?: ProductSurface; surface: ProductSurface }) {
  const router = useRouter();
  const t = useTranslations("ProductSurfaces.habigoal");
  const [activeProjection, setActiveProjection] = useState(projection);
  const [draftValues, setDraftValues] = useState<MetricDraft>(projection.values);
  const [completedHabits, setCompletedHabits] = useState<HabigoalHabitKey[]>(projection.completedHabits);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [habitsReviewed, setHabitsReviewed] = useState(projection.hasLiveHabits);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<HabigoalView>("flow");
  const [stepIndex, setStepIndex] = useState(0);

  const habitScore = Math.round((completedHabits.length / HABIT_PLAN.length) * 100);
  const hasCompleteDraft = Object.values(draftValues).every((value) => typeof value === "number" && Number.isFinite(value));
  const hasRecordedHabits = habitsReviewed || activeProjection.hasLiveHabits;
  const statusAvailable = activeProjection.hasLiveCheckIn && activeProjection.hasLiveHabits && activeProjection.score !== null;
  const score = statusAvailable ? activeProjection.score : null;
  const statusState = statusAvailable ? surfaceStateFromStatus(activeProjection.status) : "neutral";
  const statusLabel = statusAvailable ? t(`states.${activeProjection.status}`) : t("statusLocked");
  const scoreText = statusAvailable && score !== null ? String(score) : t("statusLocked");
  const scoreAria = statusAvailable && score !== null ? t("scoreAria", { score }) : t("scorePendingAria");
  const canSave = Boolean(activeProjection.athleteId) && hasCompleteDraft && hasRecordedHabits && !saving;
  const step = WIZARD_STEPS[stepIndex];

  function setMetric(key: keyof MetricDraft, value: number) {
    setDraftValues((current) => ({ ...current, [key]: value }));
    setFeedback(null);
  }

  function toggleHabit(id: HabigoalHabitKey) {
    setCompletedHabits((current) => current.includes(id) ? current.filter((item) => item !== id) : [...new Set([...current, id])]);
    setHabitsReviewed(true);
    setFeedback(null);
  }

  function goToStep(next: number) {
    setStepIndex(Math.max(0, Math.min(WIZARD_STEPS.length - 1, next)));
    setFeedback(null);
  }

  function advanceFromHabits() {
    setHabitsReviewed(true);
    goToStep(stepIndex + 1);
  }

  function startUpdate() {
    setStepIndex(0);
    setFeedback(null);
    setView("flow");
  }

  async function completeDailyOperation() {
    if (!activeProjection.athleteId) {
      setFeedback({ kind: "error", messageKey: "errors.profileRequired" });
      return;
    }
    if (!hasCompleteDraft) {
      setFeedback({ kind: "error", messageKey: "errors.completeCheckIn" });
      return;
    }
    if (!hasRecordedHabits) {
      setFeedback({ kind: "error", messageKey: "habits.confirmRequired" });
      return;
    }

    setSaving(true);
    setFeedback(null);
    try {
      const response = await fetch("/api/habigoal/daily-operation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          athleteId: activeProjection.athleteId,
          localDate: activeProjection.localDate,
          timezone: activeProjection.timezone,
          idempotencyKey: `habigoal:${activeProjection.athleteId}:${activeProjection.localDate}`,
          values: draftValues,
          habits: completedHabits
        })
      });
      const payload = await response.json().catch(() => null) as null | {
        code?: string;
        correlationId?: string;
        ok?: boolean;
        projection?: HabigoalTodayProjection;
      };

      if (!response.ok || !payload?.ok || !payload.projection) {
        setFeedback({
          correlationId: payload?.correlationId,
          kind: "error",
          messageKey: payload?.code === "AUTH_REQUIRED" ? "errors.sessionExpired" : "errors.saveFailed"
        });
        return;
      }

      setActiveProjection(payload.projection);
      setDraftValues(payload.projection.values);
      setCompletedHabits(payload.projection.completedHabits);
      setHabitsReviewed(payload.projection.hasLiveHabits);
      setStepIndex(0);
      setFeedback({ correlationId: payload.correlationId, kind: "success", messageKey: "saved" });
      router.refresh();
    } catch {
      setFeedback({ kind: "error", messageKey: "errors.saveFailed" });
    } finally {
      setSaving(false);
    }
  }

  const showResult = view === "flow" && statusAvailable;
  const showWizard = view === "flow" && !statusAvailable;

  return (
    <Box className="habigoal-product-shell">
      <Box className="hbg-app-frame" px={{ base: "sm", md: "md" }} py={{ base: 0, md: "md" }} mx="auto">
        <Box className="hbg-desktop-topbar">
          <SurfaceTopBar surface={surface} />
        </Box>

        <Box className="hbg-mobile-app-header">
          <Group gap="sm" wrap="nowrap">
            <Image src="/images/habigoal_logo.png" alt="" width={38} height={38} priority />
            <Stack gap={0}>
              <Text className="hbg-kicker">{t("todayLabel")}</Text>
              <Text fw={900}>Habigoal</Text>
            </Stack>
          </Group>
          {statusAvailable ? (
            <Box className="hbg-score-pill" aria-label={scoreAria}>{scoreText}</Box>
          ) : null}
        </Box>

        <Box component="main" className="hbg-main-grid" pb="xl">
          {feedback ? (
            <Alert color={feedback.kind === "success" ? "tactical" : "red"} title={feedback.kind === "success" ? t("savedTitle") : t("errors.title")} role={feedback.kind === "success" ? "status" : "alert"}>
              <Stack gap={4}>
                <Text>{t(feedback.messageKey)}</Text>
                {feedback.correlationId ? <Text size="sm">{t("errors.reference", { correlationId: feedback.correlationId })}</Text> : null}
              </Stack>
            </Alert>
          ) : null}

          {view === "progress" ? (
            <ProgressPanel history={history} translate={t} />
          ) : null}

          {showResult ? (
            <ResultPanel
              completed={completedHabits.length}
              habitTotal={HABIT_PLAN.length}
              nextAction={t(`nextAction.${activeProjection.nextActionKey}`)}
              onUpdate={startUpdate}
              onViewProgress={() => setView("progress")}
              reasons={activeProjection.reasonCodes.filter((code) => t.has(`reasons.${code}`)).map((code) => t(`reasons.${code}`))}
              reasonsTitle={t("reasons.title")}
              score={score ?? 0}
              scoreAria={scoreAria}
              scoreText={scoreText}
              state={statusState}
              statusLabel={statusLabel}
              translate={t}
            />
          ) : null}

          {showWizard ? (
            <DailyWizard
              canSave={canSave}
              completedHabits={completedHabits}
              draftValues={draftValues}
              habitScore={habitScore}
              hasCompleteDraft={hasCompleteDraft}
              onBack={() => goToStep(stepIndex - 1)}
              onContinue={() => goToStep(stepIndex + 1)}
              onContinueHabits={advanceFromHabits}
              onSave={completeDailyOperation}
              onSetMetric={setMetric}
              onToggleHabit={toggleHabit}
              saving={saving}
              step={step}
              stepIndex={stepIndex}
              translate={t}
            />
          ) : null}
        </Box>

        <nav className="hbg-bottom-nav hbg-bottom-nav-2" aria-label={t("navigation.aria")}>
          <button
            type="button"
            className={view === "flow" ? "hbg-bottom-nav-item hbg-bottom-nav-item-active" : "hbg-bottom-nav-item"}
            aria-current={view === "flow" ? "page" : undefined}
            onClick={() => setView("flow")}
          >
            <GdsIcons.Profile size={20} />
            <span>{t("navigation.today")}</span>
          </button>
          <button
            type="button"
            className={view === "progress" ? "hbg-bottom-nav-item hbg-bottom-nav-item-active" : "hbg-bottom-nav-item"}
            aria-current={view === "progress" ? "page" : undefined}
            onClick={() => setView("progress")}
          >
            <GdsIcons.Record size={20} />
            <span>{t("navigation.progress")}</span>
          </button>
        </nav>
      </Box>
    </Box>
  );
}

function DailyWizard({
  canSave,
  completedHabits,
  draftValues,
  habitScore,
  hasCompleteDraft,
  onBack,
  onContinue,
  onContinueHabits,
  onSave,
  onSetMetric,
  onToggleHabit,
  saving,
  step,
  stepIndex,
  translate
}: DailyWizardProps) {
  const total = WIZARD_STEPS.length;
  const progress = Math.round(((stepIndex + 1) / total) * 100);

  return (
    <Paper component="section" className="hbg-panel hbg-step-panel surface-outline" withBorder radius="md" p={{ base: "md", md: "xl" }}>
      <Stack gap="lg">
        <Stack gap={8}>
          <Group justify="space-between" wrap="nowrap">
            <Text className="hbg-kicker">{translate("flow.stepLabel", { current: stepIndex + 1, total })}</Text>
            <Text className="hbg-kicker">{progress}%</Text>
          </Group>
          <Progress value={progress} color="tactical" radius="xl" size="md" aria-hidden />
          <Title order={2} className="hbg-headline">{translate(`flow.steps.${step}.title`)}</Title>
          <Text className="hbg-copy">{translate(`flow.steps.${step}.copy`)}</Text>
        </Stack>

        {step === "checkin" ? (
          <Stack gap="lg">
            <StatusSlider label={translate("checkIn.energy")} unsetLabel={translate("checkIn.unset")} value={draftValues.energy} onChange={(value) => onSetMetric("energy", value)} />
            <StatusSlider label={translate("checkIn.mood")} unsetLabel={translate("checkIn.unset")} value={draftValues.mood} onChange={(value) => onSetMetric("mood", value)} />
            <StatusSlider label={translate("checkIn.sleep")} unsetLabel={translate("checkIn.unset")} value={draftValues.sleep} onChange={(value) => onSetMetric("sleep", value)} />
            <StatusSlider label={translate("checkIn.soreness")} unsetLabel={translate("checkIn.unset")} value={draftValues.soreness} onChange={(value) => onSetMetric("soreness", value)} inverse />
            {!hasCompleteDraft ? <Text size="sm" className="hbg-muted-text">{translate("checkIn.completeAll")}</Text> : null}
            <button type="button" className="hbg-primary-button" onClick={onContinue} disabled={!hasCompleteDraft}>
              {translate("flow.continue")}
            </button>
          </Stack>
        ) : null}

        {step === "habits" ? (
          <Stack gap="md">
            <Stack gap="sm">
              {HABIT_PLAN.map((habit) => {
                const checked = completedHabits.includes(habit.id);
                return (
                  <button
                    key={habit.id}
                    type="button"
                    className={checked ? "hbg-habit-toggle hbg-habit-toggle-on" : "hbg-habit-toggle"}
                    aria-pressed={checked}
                    onClick={() => onToggleHabit(habit.id)}
                  >
                    <span className="hbg-habit-check" aria-hidden>{checked ? <GdsIcons.Check size={18} /> : null}</span>
                    <span className="hbg-habit-label">
                      {translate("habits.itemLabel", {
                        category: translate(`habits.categories.${habit.category}`),
                        label: translate(`habits.items.${habit.id}`)
                      })}
                    </span>
                  </button>
                );
              })}
            </Stack>
            <Box>
              <Group justify="space-between" mb={6}>
                <Text fw={800}>{translate("habits.completion")}</Text>
                <Text fw={800}>{habitScore}%</Text>
              </Group>
              <Progress value={habitScore} color={habitScore >= 70 ? "tactical" : "yellow"} radius="xl" size="lg" />
            </Box>
            <Group gap="sm" grow>
              <button type="button" className="hbg-secondary-button" onClick={onBack}>{translate("flow.back")}</button>
              <button type="button" className="hbg-primary-button" onClick={onContinueHabits}>{translate("flow.continue")}</button>
            </Group>
          </Stack>
        ) : null}

        {step === "review" ? (
          <Stack gap="md">
            <Stack gap="sm">
              <ReviewRow label={translate("checkIn.energy")} value={formatMetric(draftValues.energy)} />
              <ReviewRow label={translate("checkIn.mood")} value={formatMetric(draftValues.mood)} />
              <ReviewRow label={translate("checkIn.sleep")} value={formatMetric(draftValues.sleep)} />
              <ReviewRow label={translate("checkIn.soreness")} value={formatMetric(draftValues.soreness)} />
              <ReviewRow label={translate("habits.title")} value={translate("flow.review.habitsValue", { done: completedHabits.length, total: HABIT_PLAN.length })} />
            </Stack>
            <Group gap="sm" grow>
              <button type="button" className="hbg-secondary-button" onClick={onBack}>{translate("flow.back")}</button>
              <button type="button" className="hbg-primary-button" onClick={onSave} disabled={!canSave}>
                {saving ? translate("flow.saving") : translate("flow.saveDay")}
              </button>
            </Group>
          </Stack>
        ) : null}
      </Stack>
    </Paper>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <Group justify="space-between" className="hbg-review-row" wrap="nowrap">
      <Text fw={700}>{label}</Text>
      <Text fw={900}>{value}</Text>
    </Group>
  );
}

function ResultPanel({
  completed,
  habitTotal,
  nextAction,
  onUpdate,
  onViewProgress,
  reasons,
  reasonsTitle,
  score,
  scoreAria,
  scoreText,
  state,
  statusLabel,
  translate
}: ResultPanelProps) {
  return (
    <Stack gap="sm">
      <Paper component="section" className="hbg-hero-panel surface-outline" withBorder radius="md" p={{ base: "md", md: "xl" }}>
        <Stack gap="md" align="center">
          <Text className="hbg-kicker">{translate("flow.result.title")}</Text>
          <Box className="hbg-score-ring" style={{ "--score": `${score}%` } as CSSProperties} aria-label={scoreAria}>
            <Stack gap={0} align="center">
              <Text className="hbg-score-label">{translate("todayLabel")}</Text>
              <Title order={2} className="hbg-score-value">{scoreText}</Title>
              <Text className="hbg-score-state">{statusLabel}</Text>
            </Stack>
          </Box>
          <Text ta="center" className="hbg-copy" maw={360}>{translate("scoreExplanation")}</Text>
        </Stack>
      </Paper>

      <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="sm">
        <SignalCard label={translate("signals.habitLoop.label")} value={`${completed}/${habitTotal}`} state="neutral" detail={translate("signals.habitLoop.detail")} />
        <SignalCard label={translate("signals.nextAction.label")} value={statusLabel} state={state} detail={nextAction} />
      </SimpleGrid>

      {reasons.length > 0 ? (
        <Paper component="section" className="hbg-panel surface-outline" withBorder radius="md" p={{ base: "md", md: "lg" }}>
          <Stack gap={6}>
            <Text fw={800} size="sm">{reasonsTitle}</Text>
            {reasons.map((reason) => (
              <Text key={reason} size="sm" className="hbg-copy">• {reason}</Text>
            ))}
          </Stack>
        </Paper>
      ) : null}

      <Group gap="sm" grow>
        <button type="button" className="hbg-secondary-button" onClick={onUpdate}>{translate("flow.result.updateDay")}</button>
        <button type="button" className="hbg-primary-button" onClick={onViewProgress}>{translate("flow.result.viewProgress")}</button>
      </Group>
    </Stack>
  );
}

function ProgressPanel({ history, translate }: { history?: HabigoalHistory; translate: Translate }) {
  return (
    <Paper component="section" className="hbg-panel surface-outline" withBorder radius="md" p={{ base: "md", md: "xl" }}>
      <Stack gap="lg">
        <SectionHeading icon={<GdsIcons.Habit size={18} />} title={translate("progress.title")} copy={translate("progress.copy")} />
        <SimpleGrid cols={{ base: 1, xs: 3 }} spacing="sm">
          <SignalCard
            label={translate("progress.currentStreak")}
            value={translate("progress.days", { count: history?.currentStreak ?? 0 })}
            state={(history?.currentStreak ?? 0) > 0 ? "good" : "neutral"}
            detail={translate("progress.currentStreakDetail")}
          />
          <SignalCard
            label={translate("progress.bestStreak")}
            value={translate("progress.days", { count: history?.bestStreak ?? 0 })}
            state="neutral"
            detail={translate("progress.bestStreakDetail")}
          />
          <SignalCard
            label={translate("progress.activeDays")}
            value={translate("progress.activeDaysValue", { count: history?.activeDays ?? 0 })}
            state="neutral"
            detail={translate("progress.activeDaysDetail")}
          />
        </SimpleGrid>
        <Box>
          <Text fw={800} mb={6}>{translate("progress.last7")}</Text>
          {history && history.last7Days.length > 0 ? (
            <Group gap="xs" grow align="flex-end">
              {history.last7Days.map((day) => (
                <Stack key={day.date} gap={4} align="center">
                  <Progress
                    value={day.score}
                    color={day.score >= 70 ? "tactical" : day.score > 0 ? "yellow" : "gray"}
                    radius="xl"
                    size="lg"
                    style={{ width: "100%" }}
                    aria-label={translate("progress.dayAria", { date: day.date, score: day.score })}
                  />
                  <Text size="sm" className="hbg-muted-text">{day.date.slice(8)}</Text>
                </Stack>
              ))}
            </Group>
          ) : (
            <Text size="sm" className="hbg-muted-text">{translate("progress.empty")}</Text>
          )}
        </Box>
      </Stack>
    </Paper>
  );
}

function surfaceStateFromStatus(status: HabigoalDailyStatus): SurfaceSignalState {
  if (status === "balanced") return "good";
  if (status === "needs_support") return "risk";
  if (status === "needs_input") return "neutral";
  return "watch";
}

function formatMetric(value: number | null) {
  return value === null ? "—" : `${value}%`;
}

function StatusSlider({
  inverse = false,
  label,
  onChange,
  unsetLabel,
  value
}: {
  inverse?: boolean;
  label: string;
  onChange: (value: number) => void;
  unsetLabel: string;
  value: number | null;
}) {
  const sliderValue = value ?? 50;
  return (
    <Stack gap={8} className="hbg-slider-field">
      <Group justify="space-between">
        <Text fw={800}>{label}</Text>
        <Text fw={800}>{value === null ? unsetLabel : `${value}%`}</Text>
      </Group>
      <Slider
        value={sliderValue}
        onChange={onChange}
        min={0}
        max={100}
        step={SLIDER_STEP}
        marks={SLIDER_MARKS}
        thumbSize={30}
        color={inverse ? "review" : "ingress"}
        label={(current) => `${current}%`}
        aria-label={label}
        className="hbg-slider"
      />
    </Stack>
  );
}
