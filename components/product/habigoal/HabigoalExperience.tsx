"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { Alert, Badge, Box, Checkbox, Group, Paper, Progress, SimpleGrid, Slider, Stack, Text, Title } from "@mantine/core";
import { GdsIcons, SemanticButton } from "@doneisbetter/gds/client";
import { useTranslations } from "next-intl";
import { useMemo, useState, type CSSProperties } from "react";
import type { ProductSurface } from "@/lib/product-surfaces";
import type { HabigoalDailyStatus } from "@/lib/habigoal-status";
import type { HabigoalHabitKey, HabigoalTodayProjection } from "@/services/habigoal-product.service";
import { SectionHeading, SignalCard, SurfaceTopBar, type SurfaceSignalState } from "../ProductSurfaceShared";
import { createProductSurfaceActionPack } from "../productSurfaceActions";

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
type HabigoalDailyUiState =
  | "empty_day"
  | "check_in_in_progress"
  | "habits_in_progress"
  | "ready_to_save"
  | "saving"
  | "saved_status"
  | "save_failed_retryable"
  | "save_failed_blocked";

const HABIT_PLAN = [
  { id: "hydrate", dbKey: "hydration", category: "recovery" },
  { id: "move", dbKey: "mobility", category: "sport" },
  { id: "fuel", dbKey: "nutrition", category: "fuel" },
  { id: "reflect", dbKey: "recoverySession", category: "mental" },
  { id: "sleep", dbKey: "sleepBeforeMidnight", category: "recovery" },
  { id: "study", dbKey: "tacticalLearning", category: "life" }
] satisfies HabitItem[];

export function HabigoalExperience({ projection, surface }: { projection: HabigoalTodayProjection; relatedSurface?: ProductSurface; surface: ProductSurface }) {
  const router = useRouter();
  const t = useTranslations("ProductSurfaces.habigoal");
  const tActions = useTranslations("ProductSurfaces.actions");
  const actionPack = useMemo(
    () =>
      createProductSurfaceActionPack({
        reset: tActions("reset"),
        complete: tActions("complete")
      }),
    [tActions]
  );
  const [activeProjection, setActiveProjection] = useState(projection);
  const [draftValues, setDraftValues] = useState<MetricDraft>(projection.values);
  const [completedHabits, setCompletedHabits] = useState<HabigoalHabitKey[]>(projection.completedHabits);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [habitsReviewed, setHabitsReviewed] = useState(projection.hasLiveHabits);
  const [saving, setSaving] = useState(false);

  const habitScore = Math.round((completedHabits.length / HABIT_PLAN.length) * 100);
  const hasCompleteDraft = Object.values(draftValues).every((value) => typeof value === "number" && Number.isFinite(value));
  const hasRecordedHabits = habitsReviewed || activeProjection.hasLiveHabits;
  const statusAvailable = activeProjection.hasLiveCheckIn && activeProjection.hasLiveHabits && activeProjection.score !== null;
  const dailyUiState = resolveDailyUiState({
    hasCompleteDraft,
    hasRecordedHabits,
    hasProfile: Boolean(activeProjection.athleteId),
    saving,
    statusAvailable
  });
  const score = statusAvailable ? activeProjection.score : null;
  const statusState = statusAvailable ? surfaceStateFromStatus(activeProjection.status) : "neutral";
  const statusLabel = statusAvailable ? t(`states.${activeProjection.status}`) : t(`dailyState.${dailyUiState}`);
  const scoreText = statusAvailable && score !== null ? String(score) : t("statusLocked");
  const scoreAria = statusAvailable && score !== null ? t("scoreAria", { score }) : t("scorePendingAria");
  const canSave = Boolean(activeProjection.athleteId) && hasCompleteDraft && hasRecordedHabits && !saving;
  const progressSteps = [
    hasCompleteDraft,
    hasRecordedHabits,
    statusAvailable
  ].filter(Boolean).length;
  const dailyProgress = Math.round((progressSteps / 3) * 100);

  function setMetric(key: keyof MetricDraft, value: number) {
    setDraftValues((current) => ({ ...current, [key]: value }));
    setFeedback(null);
  }

  function toggleHabit(id: HabigoalHabitKey, checked: boolean) {
    setCompletedHabits((current) => checked ? [...new Set([...current, id])] : current.filter((item) => item !== id));
    setHabitsReviewed(true);
    setFeedback(null);
  }

  function resetValues() {
    setDraftValues(activeProjection.values);
    setCompletedHabits(activeProjection.completedHabits);
    setHabitsReviewed(activeProjection.hasLiveHabits);
    setFeedback(null);
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
      setFeedback({ correlationId: payload.correlationId, kind: "success", messageKey: "saved" });
      router.refresh();
    } catch {
      setFeedback({ kind: "error", messageKey: "errors.saveFailed" });
    } finally {
      setSaving(false);
    }
  }

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
          <Box className={statusAvailable ? "hbg-score-pill" : "hbg-score-pill hbg-score-pill-empty"} aria-label={scoreAria}>{scoreText}</Box>
        </Box>

        <Box component="main" className="hbg-main-grid" pb="xl">
          <Paper id="today" component="section" className="hbg-hero-panel surface-outline" withBorder radius="md" p={{ base: "md", md: "xl" }}>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              <Stack gap="md">
                <Group gap="sm" wrap="nowrap">
                  <Image src="/images/habigoal_logo.png" alt="" width={42} height={42} priority />
                  <Stack gap={0}>
                    <Text className="hbg-kicker">{activeProjection.athleteName || t("athleteFallback")}</Text>
                    <Title order={1} className="hbg-title">Habigoal</Title>
                  </Stack>
                </Group>

                <Stack gap="xs">
                  <Title order={2} className="hbg-headline">{statusAvailable ? t("headline") : t(`journey.${dailyUiState}.title`)}</Title>
                  <Text className="hbg-copy">{statusAvailable ? t("promise") : t(`journey.${dailyUiState}.copy`)}</Text>
                </Stack>

                <Group gap="sm" wrap="wrap">
                  <Badge className="hbg-soft-badge">{t("badges.checkIn")}</Badge>
                  <Badge className="hbg-soft-badge">{t("badges.habits")}</Badge>
                  <Badge className="hbg-soft-badge">{t("badges.action")}</Badge>
                </Group>
              </Stack>

              <Stack gap="sm" align="center" justify="center">
                {statusAvailable ? (
                  <Box className="hbg-score-ring" style={{ "--score": `${score ?? 0}%` } as CSSProperties} aria-label={scoreAria}>
                    <Stack gap={0} align="center">
                      <Text className="hbg-score-label">{t("todayLabel")}</Text>
                      <Title order={2} className="hbg-score-value">{scoreText}</Title>
                      <Text className="hbg-score-state">{statusLabel}</Text>
                    </Stack>
                  </Box>
                ) : (
                  <JourneyProgress progress={dailyProgress} state={dailyUiState} translate={t} />
                )}
                <Text ta="center" className="hbg-copy" maw={360}>
                  {statusAvailable ? t("scoreExplanation") : t("scoreEmptyExplanation")}
                </Text>
              </Stack>
            </SimpleGrid>
          </Paper>

          {feedback ? (
            <Alert color={feedback.kind === "success" ? "tactical" : "red"} title={feedback.kind === "success" ? t("savedTitle") : t("errors.title")} role={feedback.kind === "success" ? "status" : "alert"}>
              <Stack gap={4}>
                <Text>{t(feedback.messageKey)}</Text>
                {feedback.correlationId ? <Text size="sm">{t("errors.reference", { correlationId: feedback.correlationId })}</Text> : null}
              </Stack>
            </Alert>
          ) : null}

          <SimpleGrid className="hbg-signal-strip" cols={{ base: 1, xs: 3 }} spacing="sm">
            <SignalCard label={t("signals.status.label")} value={statusAvailable && score !== null ? `${score}%` : t("scoreUnavailable")} state={statusState} detail={statusAvailable ? t(`signals.status.detail.${activeProjection.confidence}`) : t(`journey.${dailyUiState}.detail`)} />
            <SignalCard label={t("signals.habitLoop.label")} value={`${completedHabits.length}/${HABIT_PLAN.length}`} state="neutral" detail={t("signals.habitLoop.detail")} />
            <SignalCard
              label={t("signals.nextAction.label")}
              value={statusLabel}
              state={statusState}
              detail={statusAvailable ? t(`nextAction.${activeProjection.nextActionKey}`) : t(`journey.${dailyUiState}.nextAction`)}
            />
          </SimpleGrid>

          <Paper id="check-in" component="section" className="hbg-panel surface-outline" withBorder radius="md" p={{ base: "md", md: "xl" }}>
            <Stack gap="lg">
              <SectionHeading icon={<GdsIcons.Profile size={18} />} title={t("checkIn.title")} copy={t("checkIn.copy")} />
              <StatusSlider label={t("checkIn.energy")} unsetLabel={t("checkIn.unset")} value={draftValues.energy} onChange={(value) => setMetric("energy", value)} />
              <StatusSlider label={t("checkIn.mood")} unsetLabel={t("checkIn.unset")} value={draftValues.mood} onChange={(value) => setMetric("mood", value)} />
              <StatusSlider label={t("checkIn.sleep")} unsetLabel={t("checkIn.unset")} value={draftValues.sleep} onChange={(value) => setMetric("sleep", value)} />
              <StatusSlider label={t("checkIn.soreness")} unsetLabel={t("checkIn.unset")} value={draftValues.soreness} onChange={(value) => setMetric("soreness", value)} inverse />
              <Group gap="sm" wrap="wrap">
                <SemanticButton action="productSurface:reset" variant="default" vocabularyPacks={[actionPack]} onClick={resetValues} disabled={saving} />
                <SemanticButton
                  action="productSurface:complete"
                  color="ingress"
                  vocabularyPacks={[actionPack]}
                  onClick={completeDailyOperation}
                  disabled={!canSave}
                  loading={saving}
                />
              </Group>
              {!hasCompleteDraft ? <Text size="sm" className="hbg-muted-text">{t("checkIn.completeAll")}</Text> : null}
              {!hasRecordedHabits ? <Text size="sm" className="hbg-muted-text">{t("habits.confirmRequired")}</Text> : null}
            </Stack>
          </Paper>

          <Paper id="habits" component="section" className="hbg-panel surface-outline" withBorder radius="md" p={{ base: "md", md: "xl" }}>
            <Stack gap="lg">
              <SectionHeading icon={<GdsIcons.Habit size={18} />} title={t("habits.title")} copy={t("habits.copy")} />
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                {HABIT_PLAN.map((habit) => (
                  <Checkbox
                    key={habit.id}
                    checked={completedHabits.includes(habit.id)}
                    label={t("habits.itemLabel", {
                      category: t(`habits.categories.${habit.category}`),
                      label: t(`habits.items.${habit.id}`)
                    })}
                    onChange={(event) => toggleHabit(habit.id, event.currentTarget.checked)}
                    className="hbg-checkbox"
                  />
                ))}
              </SimpleGrid>
              <Checkbox
                checked={habitsReviewed}
                label={t("habits.reviewed")}
                onChange={(event) => {
                  setHabitsReviewed(event.currentTarget.checked);
                  setFeedback(null);
                }}
                className="hbg-checkbox"
              />
              <Box>
                <Group justify="space-between" mb={6}>
                  <Text fw={800}>{t("habits.completion")}</Text>
                  <Text fw={800}>{habitScore}%</Text>
                </Group>
                <Progress value={habitScore} color={habitScore >= 70 ? "tactical" : "yellow"} radius="xl" size="lg" />
              </Box>
            </Stack>
          </Paper>

          <Paper id="action" component="section" className="hbg-guidance-panel surface-outline" withBorder radius="md" p={{ base: "md", md: "xl" }}>
            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
              <Stack gap="xs">
                <Text className="hbg-kicker">{t("guidance.kicker")}</Text>
                <Title order={2}>{statusAvailable ? t("guidance.title") : t("review.title")}</Title>
                <Text className="hbg-copy">{statusAvailable ? t("guidance.copy") : t("review.copy")}</Text>
              </Stack>
              <Box className="hbg-action-card">
                <Text fw={900} mb={6}>{statusLabel}</Text>
                <Text>{statusAvailable ? t(`nextAction.${activeProjection.nextActionKey}`) : t(`journey.${dailyUiState}.nextAction`)}</Text>
                {!statusAvailable ? (
                  <Box mt="md">
                    <SemanticButton
                      action="productSurface:complete"
                      color="ingress"
                      vocabularyPacks={[actionPack]}
                      onClick={completeDailyOperation}
                      disabled={!canSave}
                      loading={saving}
                    />
                    {!hasRecordedHabits ? <Text size="sm" mt="xs" className="hbg-muted-text">{t("habits.confirmRequired")}</Text> : null}
                  </Box>
                ) : null}
              </Box>
            </SimpleGrid>
          </Paper>
        </Box>

        <nav className="hbg-bottom-nav" aria-label={t("navigation.aria")}>
          <a href="#today" className="hbg-bottom-nav-item hbg-bottom-nav-item-active">
            <GdsIcons.Profile size={18} />
            <span>{t("navigation.today")}</span>
          </a>
          <a href="#check-in" className="hbg-bottom-nav-item">
            <GdsIcons.Dashboard size={18} />
            <span>{t("navigation.checkIn")}</span>
          </a>
          <a href="#habits" className="hbg-bottom-nav-item">
            <GdsIcons.Habit size={18} />
            <span>{t("navigation.habits")}</span>
          </a>
          <a href="#action" className="hbg-bottom-nav-item">
            <GdsIcons.Check size={18} />
            <span>{t("navigation.action")}</span>
          </a>
        </nav>
      </Box>
    </Box>
  );
}

function surfaceStateFromStatus(status: HabigoalDailyStatus): SurfaceSignalState {
  if (status === "balanced") return "good";
  if (status === "needs_support") return "risk";
  if (status === "needs_input") return "neutral";
  return "watch";
}

function resolveDailyUiState(input: {
  hasCompleteDraft: boolean;
  hasProfile: boolean;
  hasRecordedHabits: boolean;
  saving: boolean;
  statusAvailable: boolean;
}): HabigoalDailyUiState {
  if (!input.hasProfile) return "empty_day";
  if (input.saving) return "saving";
  if (input.statusAvailable) return "saved_status";
  if (!input.hasCompleteDraft) return "check_in_in_progress";
  if (!input.hasRecordedHabits) return "habits_in_progress";
  return "ready_to_save";
}

function JourneyProgress({
  progress,
  state,
  translate
}: {
  progress: number;
  state: HabigoalDailyUiState;
  translate: ReturnType<typeof useTranslations>;
}) {
  return (
    <Box className="hbg-score-ring hbg-score-ring-empty" style={{ "--score": `${progress}%` } as CSSProperties} aria-label={translate(`journey.${state}.aria`)}>
      <Stack gap={4} align="center">
        <Text className="hbg-score-label">{translate("todayLabel")}</Text>
        <Title order={2} className="hbg-score-value">{progress}%</Title>
        <Text className="hbg-score-state">{translate(`dailyState.${state}`)}</Text>
      </Stack>
    </Box>
  );
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
    <Stack gap={6}>
      <Group justify="space-between">
        <Text fw={800}>{label}</Text>
        <Text fw={800}>{value === null ? unsetLabel : `${value}%`}</Text>
      </Group>
      <Slider
        value={sliderValue}
        onChange={onChange}
        min={0}
        max={100}
        step={1}
        color={inverse ? "review" : "ingress"}
        label={(current) => `${current}%`}
        aria-label={label}
      />
    </Stack>
  );
}
