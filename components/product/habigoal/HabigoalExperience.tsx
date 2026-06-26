"use client";

import Image from "next/image";
import { Badge, Box, Checkbox, Group, Paper, Progress, SimpleGrid, Slider, Stack, Text, Title } from "@mantine/core";
import { GdsIcons, SemanticButton } from "@doneisbetter/gds/client";
import { useMemo, useState, type CSSProperties } from "react";
import type { ProductSurface } from "@/lib/product-surfaces";
import { FunctionDirectory, SectionHeading, SharedFoundationSection, SignalCard, SurfaceTopBar, type SurfaceSignalState } from "../ProductSurfaceShared";
import { createProductSurfaceActionPack } from "../productSurfaceActions";

type HabitItem = {
  id: string;
  label: string;
  category: string;
};

const HABIT_PLAN = [
  { id: "hydrate", label: "Hydration", category: "Recovery" },
  { id: "move", label: "Light movement", category: "Sport" },
  { id: "fuel", label: "Balanced meal", category: "Fuel" },
  { id: "reflect", label: "Reflection", category: "Mental" },
  { id: "sleep", label: "Sleep routine", category: "Recovery" },
  { id: "study", label: "Learning block", category: "Life" }
] satisfies HabitItem[];

export function HabigoalExperience({ relatedSurface, surface }: { relatedSurface?: ProductSurface; surface: ProductSurface }) {
  const actionPack = useMemo(() => createProductSurfaceActionPack(), []);
  const [energy, setEnergy] = useState(76);
  const [soreness, setSoreness] = useState(34);
  const [mood, setMood] = useState(82);
  const [sleep, setSleep] = useState(68);
  const [completedHabits, setCompletedHabits] = useState<string[]>(["hydrate", "move", "reflect", "sleep"]);
  const [completedSupportAction, setCompletedSupportAction] = useState(false);

  const readiness = Math.round((energy + mood + sleep + (100 - soreness)) / 4);
  const habitScore = Math.round((completedHabits.length / HABIT_PLAN.length) * 100);
  const dailyScore = Math.round(readiness * 0.65 + habitScore * 0.35);
  const state: SurfaceSignalState = dailyScore >= 78 && soreness < 50 ? "good" : dailyScore >= 62 ? "watch" : "risk";
  const stateLabel = state === "good" ? "Ready" : state === "watch" ? "Steady with one watch item" : "Needs support";
  const nextAction =
    state === "good"
      ? "Keep the planned sport session and protect your sleep routine tonight."
      : state === "watch"
        ? "Hydrate, keep training easy, and check soreness again after movement."
        : "Pause hard training and share today's status with your support person.";

  function toggleHabit(id: string, checked: boolean) {
    setCompletedHabits((current) => checked ? [...new Set([...current, id])] : current.filter((item) => item !== id));
  }

  function resetDemo() {
    setEnergy(76);
    setSoreness(34);
    setMood(82);
    setSleep(68);
    setCompletedHabits(["hydrate", "move", "reflect", "sleep"]);
    setCompletedSupportAction(false);
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
              <Text className="hbg-kicker">Today</Text>
              <Text fw={900}>Habigoal</Text>
            </Stack>
          </Group>
          <Box className="hbg-score-pill" aria-label={`Daily support score ${dailyScore}`}>{dailyScore}</Box>
        </Box>

        <Box component="main" className="hbg-main-grid" pb="xl">
          <Paper id="today" component="section" className="hbg-hero-panel surface-outline" withBorder radius="md" p={{ base: "lg", md: "xl" }}>
            <SimpleGrid cols={1} spacing="lg">
              <Stack gap="lg">
                <Group gap="sm" wrap="nowrap">
                  <Image src="/images/habigoal_logo.png" alt="" width={44} height={44} priority />
                  <Stack gap={0}>
                    <Text className="hbg-kicker">{surface.theme.name}</Text>
                    <Title order={1} className="hbg-title">Habigoal</Title>
                  </Stack>
                </Group>

                <Stack gap="sm">
                  <Title order={2} className="hbg-headline">{surface.headline}</Title>
                  <Text size="lg" className="hbg-copy">{surface.promise}</Text>
                </Stack>

                <Group gap="sm" wrap="wrap">
                  <Badge className="hbg-soft-badge">Check in</Badge>
                  <Badge className="hbg-soft-badge">Habits</Badge>
                  <Badge className="hbg-soft-badge">Support</Badge>
                </Group>
              </Stack>

              <Stack gap="md" align="center" justify="center">
                <Box className="hbg-score-ring" style={{ "--score": `${dailyScore}%` } as CSSProperties} aria-label={`Daily support score ${dailyScore}`}>
                  <Stack gap={0} align="center">
                    <Text className="hbg-score-label">Today</Text>
                    <Title order={2} className="hbg-score-value">{dailyScore}</Title>
                    <Text className="hbg-score-state">{stateLabel}</Text>
                  </Stack>
                </Box>
                <Text ta="center" className="hbg-copy" maw={420}>
                  The score is calculated from the same readiness and habit data that AthleteIQ can use, but the experience stays simple.
                </Text>
              </Stack>
            </SimpleGrid>
          </Paper>

          <SimpleGrid className="hbg-signal-strip" cols={3} spacing="sm">
            <SignalCard label="Readiness" value={`${readiness}%`} state={state} detail="Wellbeing, sleep, mood, soreness" />
            <SignalCard label="Habit loop" value={`${completedHabits.length}/${HABIT_PLAN.length}`} state="neutral" detail="Daily accountability without pro dashboards" />
            <SignalCard label="Support action" value={completedSupportAction ? "Done" : "Open"} state={completedSupportAction ? "good" : "watch"} detail="One safe next action" />
          </SimpleGrid>

          <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
            <Paper id="check-in" component="section" className="hbg-panel surface-outline" withBorder radius="md" p={{ base: "lg", md: "xl" }}>
              <Stack gap="lg">
                <SectionHeading icon={<GdsIcons.Profile size={18} />} title="Daily check-in" copy="Adjust the signals to see the client-safe guidance update immediately." />
                <StatusSlider label="Energy" value={energy} onChange={setEnergy} />
                <StatusSlider label="Mood" value={mood} onChange={setMood} />
                <StatusSlider label="Sleep quality" value={sleep} onChange={setSleep} />
                <StatusSlider label="Soreness" value={soreness} onChange={setSoreness} inverse />
                <Group gap="sm" wrap="wrap">
                  <SemanticButton action="productSurface:reset" variant="default" vocabularyPacks={[actionPack]} onClick={resetDemo} />
                  <SemanticButton
                    action="productSurface:complete"
                    color="ingress"
                    vocabularyPacks={[actionPack]}
                    onClick={() => setCompletedSupportAction(true)}
                  />
                </Group>
              </Stack>
            </Paper>

            <Paper id="habits" component="section" className="hbg-panel surface-outline" withBorder radius="md" p={{ base: "lg", md: "xl" }}>
              <Stack gap="lg">
                <SectionHeading icon={<GdsIcons.Habit size={18} />} title="Habit support" copy="Simple habit controls stay separated from the professional OS." />
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                  {HABIT_PLAN.map((habit) => (
                    <Checkbox
                      key={habit.id}
                      checked={completedHabits.includes(habit.id)}
                      label={`${habit.label} (${habit.category})`}
                      onChange={(event) => toggleHabit(habit.id, event.currentTarget.checked)}
                      className="hbg-checkbox"
                    />
                  ))}
                </SimpleGrid>
                <Box>
                  <Group justify="space-between" mb={6}>
                    <Text fw={800}>Completion</Text>
                    <Text fw={800}>{habitScore}%</Text>
                  </Group>
                  <Progress value={habitScore} color={habitScore >= 70 ? "green" : "yellow"} radius="xl" size="lg" />
                </Box>
              </Stack>
            </Paper>
          </SimpleGrid>

          <Paper id="action" component="section" className="hbg-guidance-panel surface-outline" withBorder radius="md" p={{ base: "lg", md: "xl" }}>
            <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
              <Stack gap="xs">
                <Text className="hbg-kicker">Automatic feedback</Text>
                <Title order={2}>One clear next action</Title>
                <Text className="hbg-copy">Habigoal avoids professional density. It explains the status, the source, and the next action.</Text>
              </Stack>
              <Box className="hbg-action-card">
                <Text fw={900} mb={6}>{stateLabel}</Text>
                <Text>{nextAction}</Text>
              </Box>
              <Box className="hbg-action-card">
                <Text fw={900} mb={6}>Source data</Text>
                <Text>Daily status ledger, habit completion, readiness model, and guidance events.</Text>
              </Box>
            </SimpleGrid>
          </Paper>

          <SharedFoundationSection surface={surface} relatedSurface={relatedSurface} />
          <FunctionDirectory surface={surface} compact />
        </Box>

        <nav className="hbg-bottom-nav" aria-label="Habigoal app navigation">
          <a href="#today" className="hbg-bottom-nav-item hbg-bottom-nav-item-active">
            <GdsIcons.Profile size={18} />
            <span>Today</span>
          </a>
          <a href="#check-in" className="hbg-bottom-nav-item">
            <GdsIcons.Dashboard size={18} />
            <span>Check-in</span>
          </a>
          <a href="#habits" className="hbg-bottom-nav-item">
            <GdsIcons.Habit size={18} />
            <span>Habits</span>
          </a>
          <a href="#action" className="hbg-bottom-nav-item">
            <GdsIcons.Check size={18} />
            <span>Action</span>
          </a>
        </nav>
      </Box>
    </Box>
  );
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
        color={inverse ? "orange" : "teal"}
        label={(current) => `${current}%`}
        aria-label={label}
      />
    </Stack>
  );
}
