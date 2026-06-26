"use client";

import Image from "next/image";
import { Badge, Box, Checkbox, Group, Paper, Progress, SimpleGrid, Slider, Stack, Text, Title } from "@mantine/core";
import { GdsIcons, SemanticButton } from "@doneisbetter/gds/client";
import { useTranslations } from "next-intl";
import { useMemo, useState, type CSSProperties } from "react";
import type { ProductSurface } from "@/lib/product-surfaces";
import type { HabigoalHabitKey, HabigoalTodayProjection } from "@/services/habigoal-product.service";
import { SectionHeading, SignalCard, SurfaceTopBar, type SurfaceSignalState } from "../ProductSurfaceShared";
import { createProductSurfaceActionPack } from "../productSurfaceActions";

type HabitItem = {
  id: HabigoalHabitKey;
  dbKey: string;
  category: string;
};

const HABIT_PLAN = [
  { id: "hydrate", dbKey: "hydration", category: "recovery" },
  { id: "move", dbKey: "mobility", category: "sport" },
  { id: "fuel", dbKey: "nutrition", category: "fuel" },
  { id: "reflect", dbKey: "recoverySession", category: "mental" },
  { id: "sleep", dbKey: "sleepBeforeMidnight", category: "recovery" },
  { id: "study", dbKey: "tacticalLearning", category: "life" }
] satisfies HabitItem[];

export function HabigoalExperience({ projection, surface }: { projection: HabigoalTodayProjection; relatedSurface?: ProductSurface; surface: ProductSurface }) {
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
  const [energy, setEnergy] = useState(projection.values.energy);
  const [soreness, setSoreness] = useState(projection.values.soreness);
  const [mood, setMood] = useState(projection.values.mood);
  const [sleep, setSleep] = useState(projection.values.sleep);
  const [completedHabits, setCompletedHabits] = useState<HabigoalHabitKey[]>(projection.completedHabits);
  const [completedSupportAction, setCompletedSupportAction] = useState(false);
  const [saving, setSaving] = useState(false);

  const readiness = Math.round((energy + mood + sleep + (100 - soreness)) / 4);
  const habitScore = Math.round((completedHabits.length / HABIT_PLAN.length) * 100);
  const dailyScore = Math.round(readiness * 0.65 + habitScore * 0.35);
  const state: SurfaceSignalState = dailyScore >= 78 && soreness < 50 ? "good" : dailyScore >= 62 ? "watch" : "risk";
  const stateLabel = t(`states.${state}`);
  const nextAction = t(`nextAction.${state}`);

  function toggleHabit(id: HabigoalHabitKey, checked: boolean) {
    setCompletedHabits((current) => checked ? [...new Set([...current, id])] : current.filter((item) => item !== id));
  }

  function resetValues() {
    setEnergy(projection.values.energy);
    setSoreness(projection.values.soreness);
    setMood(projection.values.mood);
    setSleep(projection.values.sleep);
    setCompletedHabits(projection.completedHabits);
    setCompletedSupportAction(false);
  }

  async function completeDailyOperation() {
    if (!projection.athleteId) return;
    setSaving(true);
    try {
      const statuses = Object.fromEntries(
        HABIT_PLAN.map((habit) => [habit.dbKey, completedHabits.includes(habit.id)])
      );
      const habitResponse = await fetch(`/api/athletes/${projection.athleteId}/habits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: projection.localDate,
          statuses
        })
      });
      if (!habitResponse.ok) return;

      const checkInResponse = await fetch("/api/athleteiq/check-ins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          athleteId: projection.athleteId,
          mode: "lifestyle",
          timezone: projection.timezone,
          idempotencyKey: `habigoal:${projection.athleteId}:${projection.localDate}`,
          values: {
            sleepQuality: percentToTenPoint(sleep),
            fatigue: percentToTenPoint(100 - energy),
            pain: percentToTenPoint(soreness),
            stress: percentToTenPoint(100 - mood),
            mood: percentToTenPoint(mood)
          }
        })
      });
      if (!checkInResponse.ok) return;
      setCompletedSupportAction(true);
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
          <Box className="hbg-score-pill" aria-label={t("scoreAria", { score: dailyScore })}>{dailyScore}</Box>
        </Box>

        <Box component="main" className="hbg-main-grid" pb="xl">
          <Paper id="today" component="section" className="hbg-hero-panel surface-outline" withBorder radius="md" p={{ base: "lg", md: "xl" }}>
            <SimpleGrid cols={1} spacing="lg">
              <Stack gap="lg">
                <Group gap="sm" wrap="nowrap">
                  <Image src="/images/habigoal_logo.png" alt="" width={44} height={44} priority />
                  <Stack gap={0}>
                    <Text className="hbg-kicker">{t("themeName")}</Text>
                    <Title order={1} className="hbg-title">Habigoal</Title>
                  </Stack>
                </Group>

                <Stack gap="sm">
                  <Title order={2} className="hbg-headline">{t("headline")}</Title>
                  <Text size="lg" className="hbg-copy">{t("promise")}</Text>
                </Stack>

                <Group gap="sm" wrap="wrap">
                  <Badge className="hbg-soft-badge">{t("badges.checkIn")}</Badge>
                  <Badge className="hbg-soft-badge">{t("badges.habits")}</Badge>
                  <Badge className="hbg-soft-badge">{t("badges.support")}</Badge>
                </Group>
              </Stack>

              <Stack gap="md" align="center" justify="center">
                <Box className="hbg-score-ring" style={{ "--score": `${dailyScore}%` } as CSSProperties} aria-label={t("scoreAria", { score: dailyScore })}>
                  <Stack gap={0} align="center">
                    <Text className="hbg-score-label">{t("todayLabel")}</Text>
                    <Title order={2} className="hbg-score-value">{dailyScore}</Title>
                    <Text className="hbg-score-state">{stateLabel}</Text>
                  </Stack>
                </Box>
                <Text ta="center" className="hbg-copy" maw={420}>
                  {t("scoreExplanation")}
                </Text>
              </Stack>
            </SimpleGrid>
          </Paper>

          <SimpleGrid className="hbg-signal-strip" cols={3} spacing="sm">
            <SignalCard label={t("signals.readiness.label")} value={`${readiness}%`} state={state} detail={t("signals.readiness.detail")} />
            <SignalCard label={t("signals.habitLoop.label")} value={`${completedHabits.length}/${HABIT_PLAN.length}`} state="neutral" detail={t("signals.habitLoop.detail")} />
            <SignalCard
              label={t("signals.supportAction.label")}
              value={completedSupportAction ? t("signals.supportAction.done") : t("signals.supportAction.open")}
              state={completedSupportAction ? "good" : "watch"}
              detail={t("signals.supportAction.detail")}
            />
          </SimpleGrid>

          <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
            <Paper id="check-in" component="section" className="hbg-panel surface-outline" withBorder radius="md" p={{ base: "lg", md: "xl" }}>
              <Stack gap="lg">
                <SectionHeading icon={<GdsIcons.Profile size={18} />} title={t("checkIn.title")} copy={t("checkIn.copy")} />
                <StatusSlider label={t("checkIn.energy")} value={energy} onChange={setEnergy} />
                <StatusSlider label={t("checkIn.mood")} value={mood} onChange={setMood} />
                <StatusSlider label={t("checkIn.sleep")} value={sleep} onChange={setSleep} />
                <StatusSlider label={t("checkIn.soreness")} value={soreness} onChange={setSoreness} inverse />
                <Group gap="sm" wrap="wrap">
                  <SemanticButton action="productSurface:reset" variant="default" vocabularyPacks={[actionPack]} onClick={resetValues} />
                  <SemanticButton
                    action="productSurface:complete"
                    color="ingress"
                    vocabularyPacks={[actionPack]}
                    onClick={completeDailyOperation}
                    disabled={!projection.athleteId || saving}
                    loading={saving}
                  />
                </Group>
              </Stack>
            </Paper>

            <Paper id="habits" component="section" className="hbg-panel surface-outline" withBorder radius="md" p={{ base: "lg", md: "xl" }}>
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
                <Box>
                  <Group justify="space-between" mb={6}>
                    <Text fw={800}>{t("habits.completion")}</Text>
                    <Text fw={800}>{habitScore}%</Text>
                  </Group>
                  <Progress value={habitScore} color={habitScore >= 70 ? "tactical" : "yellow"} radius="xl" size="lg" />
                </Box>
              </Stack>
            </Paper>
          </SimpleGrid>

          <Paper id="action" component="section" className="hbg-guidance-panel surface-outline" withBorder radius="md" p={{ base: "lg", md: "xl" }}>
            <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
              <Stack gap="xs">
                <Text className="hbg-kicker">{t("guidance.kicker")}</Text>
                <Title order={2}>{t("guidance.title")}</Title>
                <Text className="hbg-copy">{t("guidance.copy")}</Text>
              </Stack>
              <Box className="hbg-action-card">
                <Text fw={900} mb={6}>{stateLabel}</Text>
                <Text>{nextAction}</Text>
              </Box>
              <Box className="hbg-action-card">
                <Text fw={900} mb={6}>{t("guidance.sourceTitle")}</Text>
                <Text>{t("guidance.sourceBody")}</Text>
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

function percentToTenPoint(value: number) {
  const clamped = Math.max(0, Math.min(100, value));
  return Math.max(1, Math.min(10, Math.round((clamped / 100) * 9 + 1)));
}

function StatusSlider({
  inverse = false,
  label,
  onChange,
  value
}: {
  inverse?: boolean;
  label: string;
  onChange: (value: number) => void;
  value: number;
}) {
  return (
    <Stack gap={6}>
      <Group justify="space-between">
        <Text fw={800}>{label}</Text>
        <Text fw={800}>{value}%</Text>
      </Group>
      <Slider
        value={value}
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
