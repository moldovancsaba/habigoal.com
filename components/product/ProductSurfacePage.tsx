"use client";

import Image from "next/image";
import {
  Badge,
  Box,
  Checkbox,
  Group,
  Paper,
  Progress,
  SegmentedControl,
  SimpleGrid,
  Slider,
  Stack,
  Text,
  ThemeIcon,
  Title
} from "@mantine/core";
import { createGdsVocabularyPack, GdsIcons, PageHeader, SectionPanel, SemanticButton } from "@doneisbetter/gds/client";
import { useMemo, useState, type ComponentType, type ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import type { ProductFunction, ProductSurface, ProductSurfaceAudience, ProductSurfaceId, ProductTheme } from "@/lib/product-surfaces";

type ProductSurfacePageProps = {
  surface: ProductSurface;
  relatedSurface?: ProductSurface;
};

type HabitItem = {
  id: string;
  label: string;
  category: string;
};

type PriorityAthlete = {
  id: string;
  name: string;
  squad: string;
  readiness: number;
  load: number;
  mental: number;
  reason: string;
  action: string;
  source: string;
  severity: "risk" | "watch" | "good";
};

type ServiceModule = {
  id: string;
  name: string;
  owner: string;
  progress: number;
  output: string;
  status: "ready" | "needs data" | "roadmap";
};

const HABIT_PLAN = [
  { id: "hydrate", label: "Hydration", category: "Recovery" },
  { id: "move", label: "Light movement", category: "Sport" },
  { id: "fuel", label: "Balanced meal", category: "Fuel" },
  { id: "reflect", label: "Reflection", category: "Mental" },
  { id: "sleep", label: "Sleep routine", category: "Recovery" },
  { id: "study", label: "Learning block", category: "Life" }
] satisfies HabitItem[];

const PRIORITY_ATHLETES = [
  {
    id: "lena",
    name: "Lena F.",
    squad: "U16 performance",
    readiness: 64,
    load: 82,
    mental: 72,
    reason: "High load with lower readiness after two hard days.",
    action: "Move to low-impact technical plan and check soreness.",
    source: "Habigoal daily status + training load",
    severity: "watch"
  },
  {
    id: "mate",
    name: "Mate B.",
    squad: "Academy sprint",
    readiness: 52,
    load: 68,
    mental: 48,
    reason: "Mental edge and sleep trend dropped below baseline.",
    action: "Assign recovery conversation and shorten session blocks.",
    source: "Reflection + readiness route",
    severity: "risk"
  },
  {
    id: "anna",
    name: "Anna K.",
    squad: "Return-to-play",
    readiness: 79,
    load: 54,
    mental: 84,
    reason: "Green route with controlled load and consistent habits.",
    action: "Progress one planned training block.",
    source: "Daily IQ + pain safety",
    severity: "good"
  }
] satisfies PriorityAthlete[];

const SERVICE_MODULES = [
  {
    id: "daily-report",
    name: "Daily readiness report",
    owner: "Coach OS",
    progress: 92,
    output: "Team-ready PDF and dashboard summary",
    status: "ready"
  },
  {
    id: "academy-review",
    name: "Academy review package",
    owner: "Academy OS",
    progress: 74,
    output: "Role-redacted athlete and parent views",
    status: "ready"
  },
  {
    id: "lab-profile",
    name: "Sports lab profile",
    owner: "Services",
    progress: 46,
    output: "Needs benchmark and testing data",
    status: "needs data"
  },
  {
    id: "gameflow",
    name: "GameFlow match intelligence",
    owner: "Partner/Future",
    progress: 28,
    output: "Roadmap module isolated from core dashboard",
    status: "roadmap"
  }
] satisfies ServiceModule[];

export function ProductSurfacePage({ surface, relatedSurface }: ProductSurfacePageProps) {
  const actionPack = useMemo(
    () =>
      createGdsVocabularyPack("productSurface", {
        home: { defaultMessage: "Home", icon: GdsIcons.Back },
        dashboard: { defaultMessage: "Open dashboard", icon: GdsIcons.Dashboard },
        habigoal: { defaultMessage: "Open Habigoal", icon: GdsIcons.Profile },
        aiq: { defaultMessage: "Open Athlete IQ", icon: GdsIcons.Dashboard },
        reset: { defaultMessage: "Reset demo", icon: GdsIcons.Restore },
        complete: { defaultMessage: "Complete action", icon: GdsIcons.Check },
        acknowledge: { defaultMessage: "Acknowledge", icon: GdsIcons.Check },
        report: { defaultMessage: "Open report", icon: GdsIcons.Eye },
        launch: { defaultMessage: "Launch module", icon: GdsIcons.Launch }
      }),
    []
  );

  if (surface.id === "habigoal") {
    return <HabigoalExperience actionPack={actionPack} relatedSurface={relatedSurface} surface={surface} />;
  }

  return <AthleteIqExperience actionPack={actionPack} relatedSurface={relatedSurface} surface={surface} />;
}

function HabigoalExperience({
  actionPack,
  relatedSurface,
  surface
}: {
  actionPack: ReturnType<typeof createGdsVocabularyPack>;
  relatedSurface?: ProductSurface;
  surface: ProductSurface;
}) {
  const [energy, setEnergy] = useState(76);
  const [soreness, setSoreness] = useState(34);
  const [mood, setMood] = useState(82);
  const [sleep, setSleep] = useState(68);
  const [completedHabits, setCompletedHabits] = useState<string[]>(["hydrate", "move", "reflect", "sleep"]);
  const [completedSupportAction, setCompletedSupportAction] = useState(false);

  const readiness = Math.round((energy + mood + sleep + (100 - soreness)) / 4);
  const habitScore = Math.round((completedHabits.length / HABIT_PLAN.length) * 100);
  const dailyScore = Math.round(readiness * 0.65 + habitScore * 0.35);
  const state = dailyScore >= 78 && soreness < 50 ? "good" : dailyScore >= 62 ? "watch" : "risk";
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
      <Box px={{ base: "md", md: "xl" }} py={{ base: "md", md: "xl" }} maw={1240} mx="auto">
        <SurfaceTopBar surface={surface} relatedSurface={relatedSurface} actionPack={actionPack} />

        <Box component="main" className="hbg-main-grid">
          <Paper component="section" className="hbg-hero-panel surface-outline" withBorder radius="md" p={{ base: "lg", md: "xl" }}>
            <SimpleGrid cols={{ base: 1, md: 2 }} spacing={{ base: "lg", md: "xl" }}>
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
                  <Badge className="hbg-soft-badge">Simple UI</Badge>
                  <Badge className="hbg-soft-badge">Client safe</Badge>
                  <Badge className="hbg-soft-badge">Shared data</Badge>
                  <Badge className="hbg-soft-badge">Automatic feedback</Badge>
                </Group>
              </Stack>

              <Stack gap="md" align="center" justify="center">
                <Box className="hbg-score-ring" style={{ "--score": `${dailyScore}%` } as React.CSSProperties} aria-label={`Daily support score ${dailyScore}`}>
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

          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
            <SignalCard label="Readiness" value={`${readiness}%`} state={state} detail="Wellbeing, sleep, mood, soreness" />
            <SignalCard label="Habit loop" value={`${completedHabits.length}/${HABIT_PLAN.length}`} state="neutral" detail="Daily accountability without pro dashboards" />
            <SignalCard label="Support action" value={completedSupportAction ? "Done" : "Open"} state={completedSupportAction ? "good" : "watch"} detail="One safe next action" />
          </SimpleGrid>

          <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
            <Paper component="section" className="hbg-panel surface-outline" withBorder radius="md" p={{ base: "lg", md: "xl" }}>
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

            <Paper component="section" className="hbg-panel surface-outline" withBorder radius="md" p={{ base: "lg", md: "xl" }}>
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

          <Paper component="section" className="hbg-guidance-panel surface-outline" withBorder radius="md" p={{ base: "lg", md: "xl" }}>
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
      </Box>
    </Box>
  );
}

function AthleteIqExperience({
  actionPack,
  relatedSurface,
  surface
}: {
  actionPack: ReturnType<typeof createGdsVocabularyPack>;
  relatedSurface?: ProductSurface;
  surface: ProductSurface;
}) {
  const [roleView, setRoleView] = useState<"coach" | "academy" | "services">("coach");
  const [acknowledged, setAcknowledged] = useState<string[]>([]);

  const activeQueue = PRIORITY_ATHLETES.filter((athlete) => !acknowledged.includes(athlete.id));
  const queueScore = Math.round(activeQueue.reduce((sum, athlete) => sum + athlete.readiness, 0) / Math.max(activeQueue.length, 1));
  const readyServices = SERVICE_MODULES.filter((module) => module.status === "ready").length;
  const proOnlyFunctions = surface.functionRegistry.filter((item) => item.id.startsWith("aiq-"));

  function acknowledge(id: string) {
    setAcknowledged((current) => current.includes(id) ? current : [...current, id]);
  }

  return (
    <Box className="aiq-product-shell">
      <Box px={{ base: "md", md: "xl" }} py={{ base: "md", md: "xl" }} maw={1480} mx="auto">
        <SurfaceTopBar surface={surface} relatedSurface={relatedSurface} actionPack={actionPack} />

        <Box className="aiq-command-layout">
          <Paper component="aside" className="aiq-sidebar-v2 surface-outline" withBorder radius="md" p="lg">
            <Stack gap="xl">
              <Group gap="md" wrap="nowrap">
                <Box className="aiq-mark" aria-hidden="true">IQ</Box>
                <Stack gap={0}>
                  <Title order={1} size="h2">AthleteIQ</Title>
                  <Text className="aiq-letter-label">Professional OS</Text>
                </Stack>
              </Group>

              <Stack gap="lg">
                <AiqNavSection title="Command" items={[
                  ["Priority queue", "#priority", GdsIcons.Dashboard],
                  ["Athletes", "#athletes", GdsIcons.Profile],
                  ["Services", "#services", GdsIcons.Record],
                  ["Shared data", "#shared", GdsIcons.History]
                ]} />
                <AiqThemeBlock theme={surface.theme} />
              </Stack>
            </Stack>
          </Paper>

          <Stack gap="md" component="main">
            <Paper component="section" className="aiq-hero-panel surface-outline" withBorder radius="md" p={{ base: "lg", md: "xl" }}>
              <SimpleGrid cols={{ base: 1, lg: 2 }} spacing={{ base: "lg", lg: "xl" }}>
                <Stack gap="lg">
                  <PageHeader
                    title={surface.name}
                    subtitle="A separate professional UI for coaches, academies, services, reports, and advanced intelligence."
                    actions={
                      <Group gap="xs" wrap="wrap">
                        <Link href="/" style={{ textDecoration: "none" }}>
                          <SemanticButton action="productSurface:home" variant="default" vocabularyPacks={[actionPack]} />
                        </Link>
                        <Link href="/dashboard" style={{ textDecoration: "none" }}>
                          <SemanticButton action="productSurface:dashboard" color="strategy" vocabularyPacks={[actionPack]} />
                        </Link>
                      </Group>
                    }
                  />
                  <Text className="aiq-command-copy" size="lg">{surface.promise}</Text>
                  <SegmentedControl
                    value={roleView}
                    onChange={(value) => setRoleView(value as "coach" | "academy" | "services")}
                    data={[
                      { value: "coach", label: "Coach OS" },
                      { value: "academy", label: "Academy OS" },
                      { value: "services", label: "Services" }
                    ]}
                    aria-label="AthleteIQ role view"
                  />
                </Stack>

                <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm" aria-label={`${surface.name} operational summary`}>
                  <MetricCard label="Open priorities" value={String(activeQueue.length)} detail="Coach action queue" />
                  <MetricCard label="Queue avg" value={`${queueScore}%`} detail="Readiness snapshot" />
                  <MetricCard label="Ready services" value={String(readyServices)} detail="Report packages" />
                </SimpleGrid>
              </SimpleGrid>
            </Paper>

            <SimpleGrid cols={{ base: 1, lg: 3 }} spacing="md">
              <Paper id="priority" component="section" className="aiq-panel surface-outline" withBorder radius="md" p="lg">
                <Stack gap="md">
                  <SectionHeading icon={<GdsIcons.Dashboard size={18} />} title="Priority queue" copy="Professional ranking powered by the shared Habigoal daily signal layer." inverse />
                  {PRIORITY_ATHLETES.map((athlete) => (
                    <PriorityAthleteCard key={athlete.id} athlete={athlete} acknowledged={acknowledged.includes(athlete.id)} actionPack={actionPack} onAcknowledge={acknowledge} />
                  ))}
                </Stack>
              </Paper>

              <Paper id="athletes" component="section" className="aiq-panel surface-outline" withBorder radius="md" p="lg">
                <Stack gap="md">
                  <SectionHeading icon={<GdsIcons.Profile size={18} />} title={roleView === "academy" ? "Academy rollup" : "Athlete command"} copy="Dense professional view with source rationale and workflow continuity." inverse />
                  {PRIORITY_ATHLETES.map((athlete) => (
                    <AiqReadinessRow key={athlete.id} athlete={athlete} />
                  ))}
                </Stack>
              </Paper>

              <Paper id="services" component="section" className="aiq-panel surface-outline" withBorder radius="md" p="lg">
                <Stack gap="md">
                  <SectionHeading icon={<GdsIcons.Record size={18} />} title="Services and reports" copy="Professional modules are visible here, not in the Habigoal client shell." inverse />
                  {SERVICE_MODULES.map((module) => (
                    <ServiceModuleCard key={module.id} module={module} actionPack={actionPack} />
                  ))}
                </Stack>
              </Paper>
            </SimpleGrid>

            {relatedSurface ? (
              <Paper component="section" className="aiq-includes-panel surface-outline" withBorder radius="md" p={{ base: "lg", md: "xl" }}>
                <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
                  <Stack gap="xs">
                    <Text className="aiq-letter-label">{surface.shortName} includes {relatedSurface.shortName}</Text>
                    <Title order={2}>Same data, different product</Title>
                    <Text className="aiq-command-copy">
                      AthleteIQ consumes Habigoal signals through shared contracts while preserving a separate professional theme, navigation, and function set.
                    </Text>
                  </Stack>
                  {relatedSurface.demoSignals.map((signal) => (
                    <SignalCard key={signal.id} label={signal.label} value={signal.value} state={signal.state} detail={signal.source} inverse />
                  ))}
                </SimpleGrid>
              </Paper>
            ) : null}

            <Box id="shared">
              <SharedFoundationSection surface={surface} relatedSurface={relatedSurface} inverse />
            </Box>
            <FunctionDirectory surface={surface} featuredFunctions={proOnlyFunctions} />
          </Stack>
        </Box>
      </Box>
    </Box>
  );
}

function SurfaceTopBar({
  actionPack,
  relatedSurface,
  surface
}: {
  actionPack: ReturnType<typeof createGdsVocabularyPack>;
  relatedSurface?: ProductSurface;
  surface: ProductSurface;
}) {
  return (
    <Group className={surface.id === "habigoal" ? "surface-topbar hbg-topbar" : "surface-topbar aiq-topbar"} justify="space-between" align="center" mb="md">
      <Group gap="sm" wrap="nowrap">
        {surface.id === "habigoal" ? <Image src="/images/habigoal_logo.png" alt="" width={32} height={32} /> : <Box className="aiq-mini-mark" aria-hidden="true">IQ</Box>}
        <Stack gap={0}>
          <Text fw={900}>{surface.name}</Text>
          <Text size="sm" className={surface.id === "habigoal" ? "hbg-muted-text" : "aiq-muted-soft"}>{surface.operatingMode}</Text>
        </Stack>
      </Group>
      <Group gap="xs" wrap="wrap">
        <Link href="/" style={{ textDecoration: "none" }}>
          <SemanticButton action="productSurface:home" variant="default" size="sm" vocabularyPacks={[actionPack]} />
        </Link>
        {relatedSurface ? (
          <Link href={relatedSurface.primaryPath} style={{ textDecoration: "none" }}>
            <SemanticButton
              action={relatedSurface.id === "habigoal" ? "productSurface:habigoal" : "productSurface:aiq"}
              variant="default"
              size="sm"
              vocabularyPacks={[actionPack]}
            />
          </Link>
        ) : (
          <Link href={surface.id === "habigoal" ? "/athlete-iq" : "/habigoal"} style={{ textDecoration: "none" }}>
            <SemanticButton action={surface.id === "habigoal" ? "productSurface:aiq" : "productSurface:habigoal"} variant="default" size="sm" vocabularyPacks={[actionPack]} />
          </Link>
        )}
      </Group>
    </Group>
  );
}

function SectionHeading({ icon, title, copy, inverse = false }: { icon: ReactNode; title: string; copy: string; inverse?: boolean }) {
  return (
    <Group align="flex-start" gap="sm" wrap="nowrap">
      <ThemeIcon variant="light" color={inverse ? "yellow" : "teal"} radius="md" aria-hidden="true">
        {icon}
      </ThemeIcon>
      <Stack gap={2}>
        <Title order={2} size="h3">{title}</Title>
        <Text size="sm" className={inverse ? "aiq-muted" : "hbg-muted-text"}>{copy}</Text>
      </Stack>
    </Group>
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

function SignalCard({ detail, inverse = false, label, state, value }: { detail: string; inverse?: boolean; label: string; state: "good" | "watch" | "risk" | "neutral"; value: string }) {
  const color = state === "good" ? "green" : state === "risk" ? "red" : state === "watch" ? "yellow" : "gray";
  return (
    <Paper className={inverse ? "aiq-signal-card surface-outline" : "hbg-signal-card surface-outline"} withBorder radius="md" p="lg">
      <Stack gap={8}>
        <Group justify="space-between" gap="sm">
          <Text fw={900}>{label}</Text>
          <Badge color={color} variant="light">{state}</Badge>
        </Group>
        <Title order={3}>{value}</Title>
        <Text size="sm" className={inverse ? "aiq-muted" : "hbg-muted-text"}>{detail}</Text>
      </Stack>
    </Paper>
  );
}

function SharedFoundationSection({ inverse = false, relatedSurface, surface }: { inverse?: boolean; relatedSurface?: ProductSurface; surface: ProductSurface }) {
  const title = relatedSurface ? `${surface.shortName} and ${relatedSurface.shortName} shared foundation` : `${surface.shortName} shared foundation`;
  return (
    <SectionPanel
      title={title}
      description="Both products use the same feature directory, data contracts, guidance audit trail, and backend capabilities. Product filtering changes the UI and permissions, not the source truth."
    >
      <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
        {surface.sharedDataContracts.map((contract) => (
          <Paper key={contract.id} className={inverse ? "aiq-data-card surface-outline" : "hbg-data-card surface-outline"} withBorder radius="md" p="lg">
            <Stack gap="sm">
              <Badge variant="light" color={inverse ? "yellow" : "teal"} w="fit-content">{contract.owner}</Badge>
              <Title order={3} size="h4">{contract.name}</Title>
              <Text size="sm" className={inverse ? "aiq-muted" : "hbg-muted-text"}>{contract.description}</Text>
              <Text size="sm"><strong>Sync:</strong> {contract.syncBehavior}</Text>
            </Stack>
          </Paper>
        ))}
      </SimpleGrid>
    </SectionPanel>
  );
}

function FunctionDirectory({ compact = false, featuredFunctions, surface }: { compact?: boolean; featuredFunctions?: ProductFunction[]; surface: ProductSurface }) {
  const functions = featuredFunctions ?? surface.functionRegistry;

  return (
    <SectionPanel
      title={`${surface.shortName} function directory`}
      description={surface.id === "habigoal" ? "Only client-safe support functions render in Habigoal." : "AthleteIQ includes every Habigoal function and adds professional-only modules."}
    >
      <SimpleGrid cols={{ base: 1, lg: compact ? 2 : 3 }} spacing="md">
        {functions.map((item) => (
          <FunctionCard key={item.id} item={item} productId={surface.id} />
        ))}
      </SimpleGrid>
    </SectionPanel>
  );
}

function FunctionCard({ item, productId }: { item: ProductFunction; productId: ProductSurfaceId }) {
  const pro = productId === "athlete-iq";
  return (
    <Paper component="article" className={pro ? "aiq-function-card surface-outline" : "hbg-function-card surface-outline"} withBorder radius="md" p="lg">
      <Stack gap="md">
        <Group justify="space-between" align="flex-start" gap="sm">
          <Stack gap={4} style={{ minWidth: 0 }}>
            <Group gap="xs" wrap="nowrap">
              <ThemeIcon variant="light" color={item.status === "planned" ? "gray" : pro ? "yellow" : "teal"} radius="md" aria-hidden="true">
                <GdsIcons.Check size={16} />
              </ThemeIcon>
              <Title order={3} size="h4">{item.name}</Title>
            </Group>
            <Text size="sm" className={pro ? "aiq-muted" : "hbg-muted-text"}>{item.summary}</Text>
          </Stack>
          <Badge variant="light" color={item.status === "planned" ? "gray" : pro ? "yellow" : "teal"}>{item.status}</Badge>
        </Group>
        <AudienceBadges audience={item.audience} pro={pro} />
        <DetailList title="Runtime flow" items={item.runtimeFlow.slice(0, 3)} pro={pro} />
        <Box className={pro ? "aiq-failure-pill" : "hbg-failure-pill"} px="sm" py="xs">
          <Text size="sm"><strong>Failure mode:</strong> {item.failureMode}</Text>
        </Box>
      </Stack>
    </Paper>
  );
}

function AudienceBadges({ audience, pro }: { audience: ProductSurfaceAudience[]; pro: boolean }) {
  return (
    <Group gap={6} wrap="wrap">
      {audience.map((item) => (
        <Badge key={item} variant="outline" color={pro ? "yellow" : "teal"}>{item}</Badge>
      ))}
    </Group>
  );
}

function DetailList({ items, pro, title }: { items: string[]; pro: boolean; title: string }) {
  return (
    <Stack gap={4}>
      <Text size="sm" tt="uppercase" fw={800} className={pro ? "aiq-muted-soft" : "hbg-muted-text"}>{title}</Text>
      <Box component="ul" m={0} ps="lg">
        {items.map((item) => (
          <Text component="li" key={item} size="sm" className={pro ? "aiq-muted" : "hbg-muted-text"}>{item}</Text>
        ))}
      </Box>
    </Stack>
  );
}

function AiqNavSection({ title, items }: { title: string; items: Array<[string, string, ComponentType<{ size?: number }>] > }) {
  return (
    <Stack gap="xs">
      <Text className="aiq-letter-label">{title}</Text>
      <Stack gap={6}>
        {items.map(([label, href, Icon], index) => (
          <a key={label} href={href} className={index === 0 ? "aiq-nav-link aiq-nav-link-active" : "aiq-nav-link"}>
            <Icon size={18} />
            <span>{label}</span>
            {index === 0 ? <span className="aiq-nav-dot" aria-hidden="true" /> : null}
          </a>
        ))}
      </Stack>
    </Stack>
  );
}

function AiqThemeBlock({ theme }: { theme: ProductTheme }) {
  return (
    <Paper className="aiq-theme-card surface-outline" withBorder radius="md" p="md">
      <Stack gap={6}>
        <Text className="aiq-letter-label">Theme</Text>
        <Text fw={900}>{theme.name}</Text>
        <Text size="sm" className="aiq-muted">{theme.surfaceTone}</Text>
      </Stack>
    </Paper>
  );
}

function MetricCard({ detail, label, value }: { detail: string; label: string; value: string }) {
  return (
    <Paper className="aiq-metric-card surface-outline" withBorder radius="md" p="md">
      <Stack gap={4}>
        <Text size="sm" tt="uppercase" className="aiq-muted-soft" fw={800}>{label}</Text>
        <Title order={2}>{value}</Title>
        <Text size="sm" className="aiq-muted-soft">{detail}</Text>
      </Stack>
    </Paper>
  );
}

function PriorityAthleteCard({
  actionPack,
  acknowledged,
  athlete,
  onAcknowledge
}: {
  actionPack: ReturnType<typeof createGdsVocabularyPack>;
  acknowledged: boolean;
  athlete: PriorityAthlete;
  onAcknowledge: (id: string) => void;
}) {
  const color = athlete.severity === "risk" ? "red" : athlete.severity === "watch" ? "yellow" : "green";

  return (
    <Box className={acknowledged ? "aiq-row-card aiq-row-card-muted" : "aiq-row-card"}>
      <Stack gap="sm">
        <Group justify="space-between" align="flex-start" gap="sm">
          <Stack gap={2}>
            <Text fw={900}>{athlete.name}</Text>
            <Text size="sm" className="aiq-muted-soft">{athlete.squad}</Text>
          </Stack>
          <Badge color={acknowledged ? "gray" : color} variant="light">{acknowledged ? "acknowledged" : athlete.severity}</Badge>
        </Group>
        <Text size="sm">{athlete.reason}</Text>
        <Text size="sm" className="aiq-muted"><strong>Action:</strong> {athlete.action}</Text>
        <Text size="sm" className="aiq-muted-faint">Source: {athlete.source}</Text>
        <SemanticButton
          action="productSurface:acknowledge"
          size="sm"
          variant={acknowledged ? "default" : "light"}
          vocabularyPacks={[actionPack]}
          onClick={() => onAcknowledge(athlete.id)}
          disabled={acknowledged}
        />
      </Stack>
    </Box>
  );
}

function AiqReadinessRow({ athlete }: { athlete: PriorityAthlete }) {
  return (
    <Box className="aiq-row-card">
      <Stack gap="xs">
        <Group justify="space-between">
          <Text fw={900}>{athlete.name}</Text>
          <Text fw={900}>{athlete.readiness}%</Text>
        </Group>
        <Progress.Root size="lg" radius="xl">
          <Progress.Section value={athlete.readiness} color={athlete.readiness >= 75 ? "green" : athlete.readiness >= 60 ? "yellow" : "red"} />
        </Progress.Root>
        <SimpleGrid cols={2} spacing={6}>
          <Text size="sm" className="aiq-muted-soft">Load {athlete.load}%</Text>
          <Text size="sm" className="aiq-muted-soft">Mental {athlete.mental}%</Text>
        </SimpleGrid>
      </Stack>
    </Box>
  );
}

function ServiceModuleCard({ actionPack, module }: { actionPack: ReturnType<typeof createGdsVocabularyPack>; module: ServiceModule }) {
  const color = module.status === "ready" ? "green" : module.status === "needs data" ? "yellow" : "gray";
  return (
    <Box className="aiq-row-card">
      <Stack gap="sm">
        <Group justify="space-between" align="flex-start">
          <Stack gap={2}>
            <Text fw={900}>{module.name}</Text>
            <Text size="sm" className="aiq-muted-soft">{module.owner}</Text>
          </Stack>
          <Badge color={color} variant="light">{module.status}</Badge>
        </Group>
        <Progress value={module.progress} color={color} radius="xl" />
        <Text size="sm" className="aiq-muted">{module.output}</Text>
        <SemanticButton
          action={module.status === "ready" ? "productSurface:report" : "productSurface:launch"}
          size="sm"
          variant="light"
          vocabularyPacks={[actionPack]}
        />
      </Stack>
    </Box>
  );
}
