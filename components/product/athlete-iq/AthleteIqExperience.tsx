"use client";

import Image from "next/image";
import { Badge, Box, Group, Paper, Progress, SegmentedControl, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { GdsIcons, getGdsVibeThemeCssVariables, PageHeader, resolveGdsVibeTheme, SemanticButton } from "@doneisbetter/gds/client";
import { useTranslations } from "next-intl";
import { useMemo, useState, type CSSProperties } from "react";
import { ATHLETE_IQ_OS_GROUPS, type AthleteIqOsGroup } from "@/lib/athlete-iq-os";
import { ATHLETE_IQ_GDS_THEME_PRESET, ATHLETE_IQ_GOLD_LOGO_SRC } from "@/lib/product-surface-branding";
import type { ProductSurface, ProductTheme } from "@/lib/product-surfaces";
import { SectionHeading, SignalCard, SurfaceTopBar } from "../ProductSurfaceShared";
import { createProductSurfaceActionPack, type ProductSurfaceActionPack } from "../productSurfaceActions";

type AiqTranslate = ReturnType<typeof useTranslations>;

type PriorityAthlete = {
  id: string;
  name: string;
  readiness: number;
  load: number;
  mental: number;
  severity: "risk" | "watch" | "good";
};

type ServiceModule = {
  id: string;
  progress: number;
  status: "ready" | "inReview";
};

type TeamOperation = {
  id: string;
  value: string;
  state: "good" | "watch" | "risk";
};

const PRIORITY_ATHLETES = [
  {
    id: "lena",
    name: "Lena F.",
    readiness: 64,
    load: 82,
    mental: 72,
    severity: "watch"
  },
  {
    id: "mate",
    name: "Mate B.",
    readiness: 52,
    load: 68,
    mental: 48,
    severity: "risk"
  },
  {
    id: "anna",
    name: "Anna K.",
    readiness: 79,
    load: 54,
    mental: 84,
    severity: "good"
  }
] satisfies PriorityAthlete[];

const SERVICE_MODULES = [
  {
    id: "daily-report",
    progress: 92,
    status: "ready"
  },
  {
    id: "academy-review",
    progress: 74,
    status: "ready"
  },
  {
    id: "session-actions",
    progress: 68,
    status: "inReview"
  },
  {
    id: "club-delivery",
    progress: 81,
    status: "ready"
  }
] satisfies ServiceModule[];

const TEAM_OPERATIONS = [
  {
    id: "club-load",
    value: "6 squads",
    state: "watch"
  },
  {
    id: "trainer-actions",
    value: "14 open",
    state: "risk"
  },
  {
    id: "team-readiness",
    value: "73%",
    state: "good"
  },
  {
    id: "club-services",
    value: "4 live",
    state: "good"
  }
] satisfies TeamOperation[];

const HIDDEN_REFERENCE_NAV_ITEMS = new Set(["habits", "roadmap", "report"]);
const ATHLETE_IQ_THEME = resolveGdsVibeTheme(ATHLETE_IQ_GDS_THEME_PRESET);
const ATHLETE_IQ_THEME_VARIABLES = getGdsVibeThemeCssVariables(ATHLETE_IQ_GDS_THEME_PRESET, "dark") as CSSProperties;

export function AthleteIqExperience({ surface }: { relatedSurface?: ProductSurface; surface: ProductSurface }) {
  const t = useTranslations("ProductSurfaces.athleteIq");
  const tActions = useTranslations("ProductSurfaces.actions");
  const actionPack = useMemo(
    () =>
      createProductSurfaceActionPack({
        athleteDashboard: tActions("athleteDashboard"),
        acknowledge: tActions("acknowledge"),
        report: tActions("report"),
        launch: tActions("launch")
      }),
    [tActions]
  );
  const roleViewOptions = useMemo(
    () => [
      { value: "coach", label: t("controls.role.coach") },
      { value: "academy", label: t("controls.role.academy") },
      { value: "services", label: t("controls.role.services") }
    ],
    [t]
  );
  const modeOptions = useMemo(
    () => [
      { value: "lifestyle", label: t("controls.mode.lifestyle") },
      { value: "performance", label: t("controls.mode.performance") }
    ],
    [t]
  );
  const visibleNavigationGroups = useMemo(
    () =>
      ATHLETE_IQ_OS_GROUPS.map((group) => ({
        ...group,
        modules: group.modules.filter((module) => !HIDDEN_REFERENCE_NAV_ITEMS.has(module.anchorId))
      })).filter((group) => group.modules.length > 0),
    []
  );
  const [roleView, setRoleView] = useState<"coach" | "academy" | "services">("coach");
  const [modeView, setModeView] = useState<"lifestyle" | "performance">("performance");
  const [acknowledged, setAcknowledged] = useState<string[]>([]);

  const activeQueue = PRIORITY_ATHLETES.filter((athlete) => !acknowledged.includes(athlete.id));
  const queueScore = Math.round(activeQueue.reduce((sum, athlete) => sum + athlete.readiness, 0) / Math.max(activeQueue.length, 1));
  const teamReadiness = Math.round(PRIORITY_ATHLETES.reduce((sum, athlete) => sum + athlete.readiness, 0) / PRIORITY_ATHLETES.length);
  const mentalAverage = Math.round(PRIORITY_ATHLETES.reduce((sum, athlete) => sum + athlete.mental, 0) / PRIORITY_ATHLETES.length);
  const dailyIq = modeView === "performance" ? 78 : 72;
  const readyServices = SERVICE_MODULES.filter((module) => module.status === "ready").length;

  function acknowledge(id: string) {
    setAcknowledged((current) => current.includes(id) ? current : [...current, id]);
  }

  function openAthleteDashboard() {
    document.getElementById("team-club")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <Box
      className="aiq-product-shell"
      data-gds-theme-preset={ATHLETE_IQ_GDS_THEME_PRESET}
      data-mantine-color-scheme="dark"
      style={ATHLETE_IQ_THEME_VARIABLES}
    >
      <Box className="aiq-workspace" px={{ base: "md", md: "xl" }} py={{ base: "md", md: "xl" }} maw={1480} mx="auto">
        <SurfaceTopBar surface={surface} />

        <Box className="aiq-command-layout">
          <Paper component="aside" className="aiq-sidebar-v2 surface-outline" withBorder radius="md" p="lg">
            <Stack gap="xl">
              <Group gap="md" wrap="nowrap">
                <Image src={ATHLETE_IQ_GOLD_LOGO_SRC} alt="" width={88} height={78} priority className="aiq-brand-logo" />
                <Stack gap={0}>
                  <Title order={1} size="h2">AthleteIQ</Title>
                  <Text className="aiq-letter-label">{t("sidebar.kicker")}</Text>
                </Stack>
              </Group>

              <Stack gap="lg">
                {visibleNavigationGroups.map((group) => (
                  <AiqNavSection key={group.title} group={group} translate={t} />
                ))}
                <AiqDailyScoreCard mode={modeView} score={dailyIq} translate={t} />
                <Paper className="aiq-mode-card surface-outline" withBorder radius="md" p="md">
                  <Stack gap="xs">
                    <Text className="aiq-letter-label">{t("controls.mode.label")}</Text>
                    <SegmentedControl
                      value={modeView}
                      onChange={(value) => setModeView(value as "lifestyle" | "performance")}
                      data={modeOptions}
                      aria-label={t("controls.mode.aria")}
                      fullWidth
                    />
                  </Stack>
                </Paper>
                <AiqThemeBlock theme={surface.theme} translate={t} />
              </Stack>
            </Stack>
          </Paper>

          <Stack gap="md" component="main">
            <Paper id="home" component="section" className="aiq-hero-panel surface-outline" withBorder radius="md" p={{ base: "lg", md: "xl" }}>
              <SimpleGrid cols={{ base: 1, lg: 2 }} spacing={{ base: "lg", lg: "xl" }}>
                <Stack gap="lg">
                  <Text className="aiq-letter-label">{t("hero.dateLabel")}</Text>
                  <PageHeader
                    title={t("hero.title")}
                    subtitle={t("hero.subtitle")}
                    actions={
                      <Group gap="xs" wrap="wrap">
                        <SemanticButton
                          action="productSurface:athleteDashboard"
                          aria-controls="team-club"
                          color="yellow"
                          onClick={openAthleteDashboard}
                          vocabularyPacks={[actionPack]}
                        />
                      </Group>
                    }
                  />
                  <Text className="aiq-command-copy" size="lg">
                    {t("hero.copy")}
                  </Text>
                  <SegmentedControl
                    value={roleView}
                    onChange={(value) => setRoleView(value as "coach" | "academy" | "services")}
                    data={roleViewOptions}
                    aria-label={t("controls.role.aria")}
                  />
                </Stack>

                <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm" aria-label={t("hero.summaryAria")}>
                  <MetricCard label={t("metrics.dailyIq")} value={String(dailyIq)} detail={t(`metrics.${modeView}Route`)} />
                  <MetricCard label={t("metrics.readiness")} value={`${teamReadiness}%`} detail={t("metrics.teamSnapshot")} />
                  <MetricCard label={t("metrics.mentalEdge")} value={`${mentalAverage}%`} detail={t("metrics.priorityAthletes")} />
                </SimpleGrid>
              </SimpleGrid>
            </Paper>

            <Paper id="team-club" component="section" className="aiq-team-command-panel surface-outline" withBorder radius="md" p={{ base: "lg", md: "xl" }}>
              <Stack gap="md">
                <SectionHeading
                  icon={<GdsIcons.Record size={18} />}
                  title={t("teamCommand.title")}
                  copy={t("teamCommand.copy")}
                  inverse
                />
                <SimpleGrid cols={{ base: 1, sm: 2, xl: 4 }} spacing="md">
                  {TEAM_OPERATIONS.map((operation) => (
                    <TeamOperationCard key={operation.id} operation={operation} translate={t} />
                  ))}
                </SimpleGrid>
                <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
                  <SignalCard label={t("signals.openPriorities.label")} value={String(activeQueue.length)} state="watch" detail={t("signals.openPriorities.detail")} inverse />
                  <SignalCard label={t("signals.queueAverage.label")} value={`${queueScore}%`} state="watch" detail={t("signals.queueAverage.detail")} inverse />
                  <SignalCard label={t("signals.readyServices.label")} value={String(readyServices)} state="good" detail={t("signals.readyServices.detail")} inverse />
                </SimpleGrid>
              </Stack>
            </Paper>

            <SimpleGrid cols={{ base: 1, lg: 3 }} spacing="md">
              <Paper id="priority" component="section" className="aiq-panel surface-outline" withBorder radius="md" p="lg">
                <Stack gap="md">
                  <SectionHeading icon={<GdsIcons.Dashboard size={18} />} title={t("priority.title")} copy={t("priority.copy")} inverse />
                  {PRIORITY_ATHLETES.map((athlete) => (
                    <PriorityAthleteCard key={athlete.id} athlete={athlete} acknowledged={acknowledged.includes(athlete.id)} actionPack={actionPack} onAcknowledge={acknowledge} translate={t} />
                  ))}
                </Stack>
              </Paper>

              <Paper id="athletes" component="section" className="aiq-panel surface-outline" withBorder radius="md" p="lg">
                <Stack gap="md">
                  <SectionHeading icon={<GdsIcons.Profile size={18} />} title={roleView === "academy" ? t("athletes.academyTitle") : t("athletes.title")} copy={t("athletes.copy")} inverse />
                  {PRIORITY_ATHLETES.map((athlete) => (
                    <AiqReadinessRow key={athlete.id} athlete={athlete} translate={t} />
                  ))}
                </Stack>
              </Paper>

              <Paper id="services" component="section" className="aiq-panel surface-outline" withBorder radius="md" p="lg">
                <Stack gap="md">
                  <SectionHeading icon={<GdsIcons.Record size={18} />} title={t("services.title")} copy={t("services.copy")} inverse />
                  {SERVICE_MODULES.map((module) => (
                    <ServiceModuleCard key={module.id} module={module} actionPack={actionPack} translate={t} />
                  ))}
                </Stack>
              </Paper>
            </SimpleGrid>
          </Stack>
        </Box>
      </Box>
    </Box>
  );
}

function TeamOperationCard({ operation, translate }: { operation: TeamOperation; translate: AiqTranslate }) {
  const color = operation.state === "risk" ? "red" : operation.state === "watch" ? "yellow" : "tactical";

  return (
    <Box className="aiq-row-card aiq-operation-card">
      <Stack gap="xs">
        <Group justify="space-between" align="flex-start" gap="sm">
          <Text size="sm" tt="uppercase" className="aiq-muted-soft" fw={800}>{translate(`operations.${operation.id}.label`)}</Text>
          <Badge color={color} variant="light">{translate(`states.${operation.state}`)}</Badge>
        </Group>
        <Title order={3}>{operation.value}</Title>
        <Text size="sm" className="aiq-muted">{translate(`operations.${operation.id}.detail`)}</Text>
      </Stack>
    </Box>
  );
}

function AiqNavSection({ group, translate }: { group: AthleteIqOsGroup; translate: AiqTranslate }) {
  return (
    <Stack gap="xs">
      <Text className="aiq-letter-label">{translate(`nav.groups.${getAiqGroupKey(group.title)}`)}</Text>
      <Stack gap={6}>
        {group.modules.map((module) => (
          <a key={module.anchorId} href={`#${module.anchorId}`} className={module.anchorId === "home" ? "aiq-nav-link aiq-nav-link-active" : "aiq-nav-link"}>
            <span>{translate(`nav.modules.${module.anchorId}`)}</span>
            <span className="aiq-nav-code">{module.code}</span>
          </a>
        ))}
      </Stack>
    </Stack>
  );
}

function getAiqGroupKey(group: AthleteIqOsGroup["title"]) {
  if (group === "Daily OS") return "dailyOs";
  if (group === "Stakeholders") return "stakeholders";
  return "development";
}

function AiqDailyScoreCard({ mode, score, translate }: { mode: "lifestyle" | "performance"; score: number; translate: AiqTranslate }) {
  return (
    <Paper className="aiq-score-card surface-outline" withBorder radius="md" p="md">
      <Stack gap={4}>
        <Text className="aiq-letter-label">{translate("metrics.dailyIq")}</Text>
        <Title order={2} className="aiq-side-score">{score}</Title>
        <Text size="sm" className="aiq-muted-soft">{translate(`controls.mode.${mode}`)}</Text>
      </Stack>
    </Paper>
  );
}

function AiqThemeBlock({ theme, translate }: { theme: ProductTheme; translate: AiqTranslate }) {
  return (
    <Paper className="aiq-theme-card surface-outline" withBorder radius="md" p="md">
      <Stack gap={6}>
        <Text className="aiq-letter-label">{translate("theme.label")}</Text>
        <Text fw={900}>{translate("theme.name") || ATHLETE_IQ_THEME.label}</Text>
        <Text size="sm" className="aiq-muted">{translate("theme.surfaceTone")}</Text>
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
  onAcknowledge,
  translate
}: {
  actionPack: ProductSurfaceActionPack;
  acknowledged: boolean;
  athlete: PriorityAthlete;
  onAcknowledge: (id: string) => void;
  translate: AiqTranslate;
}) {
  const color = athlete.severity === "risk" ? "red" : athlete.severity === "watch" ? "yellow" : "tactical";

  return (
    <Box className={acknowledged ? "aiq-row-card aiq-row-card-muted" : "aiq-row-card"}>
      <Stack gap="sm">
        <Group justify="space-between" align="flex-start" gap="sm">
          <Stack gap={2}>
            <Text fw={900}>{athlete.name}</Text>
            <Text size="sm" className="aiq-muted-soft">{translate(`priority.athletes.${athlete.id}.squad`)}</Text>
          </Stack>
          <Badge color={acknowledged ? "gray" : color} variant="light">{acknowledged ? translate("states.acknowledged") : translate(`states.${athlete.severity}`)}</Badge>
        </Group>
        <Text size="sm">{translate(`priority.athletes.${athlete.id}.reason`)}</Text>
        <Text size="sm" className="aiq-muted"><strong>{translate("priority.actionLabel")}:</strong> {translate(`priority.athletes.${athlete.id}.action`)}</Text>
        <Text size="sm" className="aiq-muted-faint">{translate("priority.sourceLabel")}: {translate(`priority.athletes.${athlete.id}.source`)}</Text>
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

function AiqReadinessRow({ athlete, translate }: { athlete: PriorityAthlete; translate: AiqTranslate }) {
  return (
    <Box className="aiq-row-card">
      <Stack gap="xs">
        <Group justify="space-between">
          <Text fw={900}>{athlete.name}</Text>
          <Text fw={900}>{athlete.readiness}%</Text>
        </Group>
        <Progress.Root size="lg" radius="xl">
          <Progress.Section value={athlete.readiness} color={athlete.readiness >= 75 ? "tactical" : athlete.readiness >= 60 ? "yellow" : "red"} />
        </Progress.Root>
        <SimpleGrid cols={2} spacing={6}>
          <Text size="sm" className="aiq-muted-soft">{translate("athletes.loadLabel")} {athlete.load}%</Text>
          <Text size="sm" className="aiq-muted-soft">{translate("athletes.mentalLabel")} {athlete.mental}%</Text>
        </SimpleGrid>
      </Stack>
    </Box>
  );
}

function ServiceModuleCard({ actionPack, module, translate }: { actionPack: ProductSurfaceActionPack; module: ServiceModule; translate: AiqTranslate }) {
  const color = module.status === "ready" ? "tactical" : "yellow";
  return (
    <Box className="aiq-row-card">
      <Stack gap="sm">
        <Group justify="space-between" align="flex-start">
          <Stack gap={2}>
            <Text fw={900}>{translate(`services.modules.${module.id}.name`)}</Text>
            <Text size="sm" className="aiq-muted-soft">{translate(`services.modules.${module.id}.owner`)}</Text>
          </Stack>
          <Badge color={color} variant="light">{translate(`services.status.${module.status}`)}</Badge>
        </Group>
        <Progress value={module.progress} color={color} radius="xl" />
        <Text size="sm" className="aiq-muted">{translate(`services.modules.${module.id}.nextStep`)}</Text>
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
