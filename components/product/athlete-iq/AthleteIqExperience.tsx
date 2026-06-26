"use client";

import Image from "next/image";
import { Badge, Box, Group, Paper, Progress, SegmentedControl, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { GdsIcons, getGdsVibeThemeCssVariables, PageHeader, resolveGdsVibeTheme, SemanticButton } from "@doneisbetter/gds/client";
import { useMemo, useState, type CSSProperties } from "react";
import { Link } from "@/i18n/navigation";
import { ATHLETE_IQ_OS_GROUPS, ATHLETE_IQ_OS_MODULES, type AthleteIqOsGroup, type AthleteIqOsModule, type AthleteIqOsStatus } from "@/lib/athlete-iq-os";
import { ATHLETE_IQ_GDS_THEME_PRESET, ATHLETE_IQ_GOLD_LOGO_SRC } from "@/lib/product-surface-branding";
import type { ProductSurface, ProductTheme } from "@/lib/product-surfaces";
import { FunctionDirectory, SectionHeading, SharedFoundationSection, SignalCard, SurfaceTopBar } from "../ProductSurfaceShared";
import { createProductSurfaceActionPack, type ProductSurfaceActionPack } from "../productSurfaceActions";

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

type TeamOperation = {
  id: string;
  label: string;
  value: string;
  detail: string;
  state: "good" | "watch" | "risk";
};

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

const TEAM_OPERATIONS = [
  {
    id: "club-load",
    label: "Club load",
    value: "6 squads",
    detail: "Trainer view across academy, return-to-play, and performance groups.",
    state: "watch"
  },
  {
    id: "trainer-actions",
    label: "Trainer actions",
    value: "14 open",
    detail: "Assigned conversations, recovery changes, reports, and plan updates.",
    state: "risk"
  },
  {
    id: "team-readiness",
    label: "Team readiness",
    value: "73%",
    detail: "Team average from Habigoal daily status and AthleteIQ planning data.",
    state: "good"
  },
  {
    id: "club-services",
    label: "Club services",
    value: "4 live",
    detail: "Reports, service packages, lab modules, and stakeholder delivery.",
    state: "good"
  }
] satisfies TeamOperation[];

const AIQ_ROLE_VIEW_OPTIONS = [
  { value: "coach", label: "Coach OS" },
  { value: "academy", label: "Academy OS" },
  { value: "services", label: "Services" }
];

const AIQ_MODE_OPTIONS = [
  { value: "lifestyle", label: "Lifestyle" },
  { value: "performance", label: "Performance" }
];

const ATHLETE_IQ_THEME = resolveGdsVibeTheme(ATHLETE_IQ_GDS_THEME_PRESET);
const ATHLETE_IQ_THEME_VARIABLES = getGdsVibeThemeCssVariables(ATHLETE_IQ_GDS_THEME_PRESET, "dark") as CSSProperties;

export function AthleteIqExperience({ relatedSurface, surface }: { relatedSurface?: ProductSurface; surface: ProductSurface }) {
  const actionPack = useMemo(() => createProductSurfaceActionPack(), []);
  const [roleView, setRoleView] = useState<"coach" | "academy" | "services">("coach");
  const [modeView, setModeView] = useState<"lifestyle" | "performance">("performance");
  const [acknowledged, setAcknowledged] = useState<string[]>([]);

  const activeQueue = PRIORITY_ATHLETES.filter((athlete) => !acknowledged.includes(athlete.id));
  const queueScore = Math.round(activeQueue.reduce((sum, athlete) => sum + athlete.readiness, 0) / Math.max(activeQueue.length, 1));
  const teamReadiness = Math.round(PRIORITY_ATHLETES.reduce((sum, athlete) => sum + athlete.readiness, 0) / PRIORITY_ATHLETES.length);
  const mentalAverage = Math.round(PRIORITY_ATHLETES.reduce((sum, athlete) => sum + athlete.mental, 0) / PRIORITY_ATHLETES.length);
  const dailyIq = modeView === "performance" ? 78 : 72;
  const readyServices = SERVICE_MODULES.filter((module) => module.status === "ready").length;
  const activeModules = ATHLETE_IQ_OS_MODULES.filter((module) => module.status === "active").length;
  const liteModules = ATHLETE_IQ_OS_MODULES.filter((module) => module.status === "lite").length;
  const proOnlyFunctions = surface.functionRegistry.filter((item) => item.id.startsWith("aiq-"));

  function acknowledge(id: string) {
    setAcknowledged((current) => current.includes(id) ? current : [...current, id]);
  }

  return (
    <Box
      className="aiq-product-shell"
      data-gds-theme-preset={ATHLETE_IQ_GDS_THEME_PRESET}
      data-mantine-color-scheme="dark"
      style={ATHLETE_IQ_THEME_VARIABLES}
    >
      <Box className="aiq-workspace" px={{ base: "md", md: "xl" }} py={{ base: "md", md: "xl" }} maw={1480} mx="auto">
        <SurfaceTopBar surface={surface} relatedSurface={relatedSurface} actionPack={actionPack} />

        <Box className="aiq-command-layout">
          <Paper component="aside" className="aiq-sidebar-v2 surface-outline" withBorder radius="md" p="lg">
            <Stack gap="xl">
              <Group gap="md" wrap="nowrap">
                <Image src={ATHLETE_IQ_GOLD_LOGO_SRC} alt="" width={88} height={78} priority className="aiq-brand-logo" />
                <Stack gap={0}>
                  <Title order={1} size="h2">AthleteIQ</Title>
                  <Text className="aiq-letter-label">Layered MVP V7</Text>
                </Stack>
              </Group>

              <Stack gap="lg">
                {ATHLETE_IQ_OS_GROUPS.map((group) => (
                  <AiqNavSection key={group.title} group={group} />
                ))}
                <AiqDailyScoreCard mode={modeView} score={dailyIq} />
                <Paper className="aiq-mode-card surface-outline" withBorder radius="md" p="md">
                  <Stack gap="xs">
                    <Text className="aiq-letter-label">Mode</Text>
                    <SegmentedControl
                      value={modeView}
                      onChange={(value) => setModeView(value as "lifestyle" | "performance")}
                      data={AIQ_MODE_OPTIONS}
                      aria-label="AthleteIQ operating mode"
                      fullWidth
                    />
                  </Stack>
                </Paper>
                <AiqThemeBlock theme={surface.theme} />
              </Stack>
            </Stack>
          </Paper>

          <Stack gap="md" component="main">
            <Paper id="home" component="section" className="aiq-hero-panel surface-outline" withBorder radius="md" p={{ base: "lg", md: "xl" }}>
              <SimpleGrid cols={{ base: 1, lg: 2 }} spacing={{ base: "lg", lg: "xl" }}>
                <Stack gap="lg">
                  <Text className="aiq-letter-label">Today - June 26, 2026</Text>
                  <PageHeader
                    title="AthleteIQ Daily Development OS"
                    subtitle="A professional operating surface for athletes, trainers, teams, clubs, reports, and honest staged intelligence."
                    actions={
                      <Group gap="xs" wrap="wrap">
                        <Link href="/" style={{ textDecoration: "none" }}>
                          <SemanticButton action="productSurface:home" variant="default" vocabularyPacks={[actionPack]} />
                        </Link>
                        <Link href="/dashboard" style={{ textDecoration: "none" }}>
                          <SemanticButton action="productSurface:dashboard" color="yellow" vocabularyPacks={[actionPack]} />
                        </Link>
                      </Group>
                    }
                  />
                  <Text className="aiq-command-copy" size="lg">
                    Readiness, mental state, pain, habits, training logs, calendar, team actions, and reports are active. Lite and future pillars stay clearly labeled.
                  </Text>
                  <SegmentedControl
                    value={roleView}
                    onChange={(value) => setRoleView(value as "coach" | "academy" | "services")}
                    data={AIQ_ROLE_VIEW_OPTIONS}
                    aria-label="AthleteIQ role view"
                  />
                </Stack>

                <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm" aria-label={`${surface.name} operational summary`}>
                  <MetricCard label="Daily IQ" value={String(dailyIq)} detail={`${modeView} route`} />
                  <MetricCard label="Readiness" value={`${teamReadiness}%`} detail="Team snapshot" />
                  <MetricCard label="Mental edge" value={`${mentalAverage}%`} detail="Priority athletes" />
                </SimpleGrid>
              </SimpleGrid>
            </Paper>

            <Paper component="section" className="aiq-truth-banner surface-outline" withBorder radius="md" p={{ base: "lg", md: "xl" }}>
              <Group gap="md" align="center" wrap="wrap">
                <Box className="aiq-ai-mark" aria-hidden="true">AI</Box>
                <Stack gap={4}>
                  <Text className="aiq-letter-label">Product Truth</Text>
                  <Title order={2}>This is the Daily Development OS, not yet the full six-pillar platform.</Title>
                  <Text className="aiq-command-copy">The UI shows active, lite, and future modules separately so trainers and clubs can trust what is operational today.</Text>
                </Stack>
              </Group>
            </Paper>

            <Paper component="section" className="aiq-os-map-panel surface-outline" withBorder radius="md" p={{ base: "lg", md: "xl" }}>
              <Stack gap="lg">
                <SectionHeading
                  icon={<GdsIcons.Dashboard size={18} />}
                  title="Daily Development OS menu"
                  copy={`${activeModules} active modules and ${liteModules} lite modules mapped from the supplied AthleteIQ reference.`}
                  inverse
                />
                {ATHLETE_IQ_OS_GROUPS.map((group) => (
                  <AiqModuleGroup key={group.title} group={group} />
                ))}
              </Stack>
            </Paper>

            <Paper id="team-club" component="section" className="aiq-team-command-panel surface-outline" withBorder radius="md" p={{ base: "lg", md: "xl" }}>
              <Stack gap="md">
                <SectionHeading
                  icon={<GdsIcons.Record size={18} />}
                  title="Trainer team and club command"
                  copy="A desktop-first operating layer for managing squads, actions, services, and club-level delivery."
                  inverse
                />
                <SimpleGrid cols={{ base: 1, sm: 2, xl: 4 }} spacing="md">
                  {TEAM_OPERATIONS.map((operation) => (
                    <TeamOperationCard key={operation.id} operation={operation} />
                  ))}
                </SimpleGrid>
                <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
                  <SignalCard label="Open priorities" value={String(activeQueue.length)} state="watch" detail="Coach action queue" inverse />
                  <SignalCard label="Queue avg" value={`${queueScore}%`} state="watch" detail="Unacknowledged readiness" inverse />
                  <SignalCard label="Ready services" value={String(readyServices)} state="good" detail="Report packages" inverse />
                </SimpleGrid>
              </Stack>
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

function TeamOperationCard({ operation }: { operation: TeamOperation }) {
  const color = operation.state === "risk" ? "red" : operation.state === "watch" ? "yellow" : "green";

  return (
    <Box className="aiq-row-card aiq-operation-card">
      <Stack gap="xs">
        <Group justify="space-between" align="flex-start" gap="sm">
          <Text size="sm" tt="uppercase" className="aiq-muted-soft" fw={800}>{operation.label}</Text>
          <Badge color={color} variant="light">{operation.state}</Badge>
        </Group>
        <Title order={3}>{operation.value}</Title>
        <Text size="sm" className="aiq-muted">{operation.detail}</Text>
      </Stack>
    </Box>
  );
}

function AiqNavSection({ group }: { group: AthleteIqOsGroup }) {
  return (
    <Stack gap="xs">
      <Text className="aiq-letter-label">{group.title}</Text>
      <Stack gap={6}>
        {group.modules.map((module) => (
          <a key={module.anchorId} href={`#${module.anchorId}`} className={module.anchorId === "home" ? "aiq-nav-link aiq-nav-link-active" : "aiq-nav-link"}>
            <span>{module.label}</span>
            <span className="aiq-nav-code">{module.code}</span>
          </a>
        ))}
      </Stack>
    </Stack>
  );
}

function AiqDailyScoreCard({ mode, score }: { mode: "lifestyle" | "performance"; score: number }) {
  return (
    <Paper className="aiq-score-card surface-outline" withBorder radius="md" p="md">
      <Stack gap={4}>
        <Text className="aiq-letter-label">Daily IQ</Text>
        <Title order={2} className="aiq-side-score">{score}</Title>
        <Text size="sm" className="aiq-muted-soft">{mode === "performance" ? "Performance" : "Lifestyle"}</Text>
      </Stack>
    </Paper>
  );
}

function AiqModuleGroup({ group }: { group: AthleteIqOsGroup }) {
  return (
    <Stack gap="sm">
      <Group justify="space-between" gap="md">
        <Text className="aiq-letter-label">{group.title}</Text>
        <Badge color="yellow" variant="light">{group.modules.length} modules</Badge>
      </Group>
      <SimpleGrid cols={{ base: 1, md: group.modules.length > 5 ? 3 : 2, xl: group.modules.length > 5 ? 4 : 3 }} spacing="md">
        {group.modules.map((module) => (
          <AiqOsModuleCard key={module.anchorId} module={module} />
        ))}
      </SimpleGrid>
    </Stack>
  );
}

function AiqOsModuleCard({ module }: { module: AthleteIqOsModule }) {
  return (
    <Box id={module.anchorId === "home" ? undefined : module.anchorId} className="aiq-row-card aiq-os-module-card">
      <Stack gap="sm">
        <Group justify="space-between" align="flex-start" gap="sm">
          <Box className="aiq-module-code">{module.code}</Box>
          <Badge color={statusColor(module.status)} variant="light">{module.stage}</Badge>
        </Group>
        <Stack gap={4}>
          <Title order={3}>{module.label}</Title>
          <Text size="sm" className="aiq-muted">{module.summary}</Text>
        </Stack>
        <Text size="sm" className="aiq-muted-faint"><strong>Output:</strong> {module.output}</Text>
      </Stack>
    </Box>
  );
}

function statusColor(status: AthleteIqOsStatus) {
  if (status === "active") {
    return "green";
  }

  if (status === "lite") {
    return "blue";
  }

  return "gray";
}

function AiqThemeBlock({ theme }: { theme: ProductTheme }) {
  return (
    <Paper className="aiq-theme-card surface-outline" withBorder radius="md" p="md">
      <Stack gap={6}>
        <Text className="aiq-letter-label">Theme</Text>
        <Text fw={900}>{ATHLETE_IQ_THEME.label}</Text>
        <Text size="sm" className="aiq-muted">{theme.surfaceTone}</Text>
        <Text size="sm" className="aiq-muted-faint">{theme.gdsPresetId}</Text>
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
  actionPack: ProductSurfaceActionPack;
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
          color="yellow"
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

function ServiceModuleCard({ actionPack, module }: { actionPack: ProductSurfaceActionPack; module: ServiceModule }) {
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
          color="yellow"
          size="sm"
          variant="light"
          vocabularyPacks={[actionPack]}
        />
      </Stack>
    </Box>
  );
}
