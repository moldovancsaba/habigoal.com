"use client";

import Image from "next/image";
import { Badge, Box, Button, Group, Paper, Progress, SegmentedControl, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { GdsIcons, getGdsVibeThemeCssVariables, PageHeader, resolveGdsVibeTheme, SemanticButton } from "@doneisbetter/gds/client";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState, type CSSProperties } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { selectCopyKey } from "@/lib/copy-variants";
import { heroSubtitleDef, neutralPromptDef } from "@/lib/surface-voice";
import { ATHLETE_IQ_GDS_THEME_PRESET, ATHLETE_IQ_GOLD_LOGO_SRC } from "@/lib/product-surface-branding";
import type { ProductSurface, ProductTheme } from "@/lib/product-surfaces";
import type {
  AthleteIqDashboardAthlete,
  AthleteIqDashboardOperation,
  AthleteIqDashboardService,
  AthleteIqProductDashboardProjection
} from "@/services/athleteiq-product-dashboard.service";
import { SectionHeading, SignalCard, SurfaceTopBar } from "../ProductSurfaceShared";
import { SharedDailyRecorder, type SharedDailyRecorderLabels } from "../SharedDailyRecorder";
import { createProductSurfaceActionPack, type ProductSurfaceActionPack } from "../productSurfaceActions";
import { DailyReminders } from "@/components/reminders/DailyReminders";
import { AiqDailyPlanPanel } from "./panels/AiqDailyPlanPanel";
import { AiqMentalEdgePanel } from "./panels/AiqMentalEdgePanel";
import { AiqReflectionPanel } from "./panels/AiqReflectionPanel";
import { AiqSessionPanel } from "./panels/AiqSessionPanel";
import { AiqLiteModulesPanel } from "./panels/AiqLiteModulesPanel";
import { AiqProgressPanel } from "./panels/AiqProgressPanel";

type AiqTranslate = ReturnType<typeof useTranslations>;
type CommonTranslate = ReturnType<typeof useTranslations>;
type AiqNavGroupKey = "dailyOs" | "development" | "stakeholders" | "workspace";
type AiqNavItem = {
  anchorId: string;
  active?: boolean;
  href?: string;
  labelKey: string;
};
type AiqNavGroup = {
  id: AiqNavGroupKey;
  items: AiqNavItem[];
};
type SupportedLocale = "en" | "hu" | "ar" | "es" | "de" | "he";
type AiqPersona = AthleteIqProductDashboardProjection["persona"];

const ATHLETE_IQ_THEME = resolveGdsVibeTheme(ATHLETE_IQ_GDS_THEME_PRESET);
const ATHLETE_IQ_THEME_VARIABLES = getGdsVibeThemeCssVariables(ATHLETE_IQ_GDS_THEME_PRESET, "dark") as CSSProperties;

export function AthleteIqExperience({ dashboard, surface, embedded = false }: { dashboard: AthleteIqProductDashboardProjection; relatedSurface?: ProductSurface; surface: ProductSurface; embedded?: boolean }) {
  const t = useTranslations("ProductSurfaces.athleteIq");
  const tActions = useTranslations("ProductSurfaces.actions");
  const common = useTranslations("Common");
  const locale = useLocale() as SupportedLocale;
  const router = useRouter();
  // Stable per-mount clock for time-aware hero voice.
  const [heroNowMs] = useState(Date.now);
  const actionPack = useMemo(
    () =>
      createProductSurfaceActionPack({
        athleteDashboard: tActions("athleteDashboard"),
        acknowledge: tActions("acknowledge"),
        complete: tActions("complete"),
        report: tActions("report"),
        reset: tActions("reset"),
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
  // The coach workspace renders five real sections; the sidebar links must
  // target those anchors (not the aspirational OS module catalogue) so the menu
  // actually scrolls.
  const visibleNavigationGroups = useMemo<AiqNavGroup[]>(
    () => [
      {
        id: "workspace",
        items: [
          { anchorId: "home", active: true, labelKey: "home" },
          { anchorId: "team-club", labelKey: "teamCommand" },
          { anchorId: "priority", labelKey: "priorityQueue" },
          { anchorId: "athletes", labelKey: "athleteCommand" },
          { anchorId: "services", labelKey: "services" }
        ]
      }
    ],
    []
  );
  const [mobileMenuOpened, setMobileMenuOpened] = useState(false);
  const [roleView, setRoleView] = useState<"coach" | "academy" | "services">("coach");
  const [modeView, setModeView] = useState<"lifestyle" | "performance">("performance");
  const [acknowledged, setAcknowledged] = useState<string[]>([]);
  const [savingAcknowledgement, setSavingAcknowledgement] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<"all" | "risk" | "watch" | "missing">("all");

  const activeQueue = dashboard.activeQueue.filter((athlete) => !acknowledged.includes(athlete.id));
  const filteredQueue = priorityFilter === "all" ? activeQueue : activeQueue.filter((athlete) => athlete.severity === priorityFilter);
  const queueScores = activeQueue.map((athlete) => athlete.readiness).filter(isNumber);
  const queueScore = averageScore(queueScores);
  const teamReadiness = dashboard.averageReadiness;
  const mentalAverage = dashboard.averageMental;
  const dailyIq = dashboard.dailyIqAverage;
  const readyServices = dashboard.services.filter((module) => module.status === "ready").length;

  async function acknowledge(athlete: AthleteIqDashboardAthlete) {
    setSavingAcknowledgement(athlete.id);
    try {
      const response = await fetch("/api/coach-actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          athleteKey: athlete.id,
          date: dashboard.localDate,
          recommendationKey: recommendationKeyForAthlete(athlete),
          status: "acknowledged",
          severity: athlete.severity === "risk" ? "critical" : "warning",
          sourceType: athlete.reasonKey === "painAlert" ? "pain-safety" : athlete.reasonKey === "missingDailyIq" ? "daily-engine" : "readiness-threshold",
          detail: `${athlete.reasonKey}:${athlete.actionKey}`
        })
      });
      if (!response.ok) return;
      setAcknowledged((current) => current.includes(athlete.id) ? current : [...current, athlete.id]);
    } finally {
      setSavingAcknowledgement(null);
    }
  }

  function openAthleteDashboard() {
    document.getElementById("team-club")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function openServiceModule(module: AthleteIqDashboardService) {
    router.push(getTrainerServiceRoute(module.id), { locale });
  }

  if (dashboard.persona === "athlete") {
    return (
      <AiqAthleteWorkspace
        actionPack={actionPack}
        dashboard={dashboard}
        embedded={embedded}
        modeOptions={modeOptions}
        modeView={modeView}
        setModeView={setModeView}
        surface={surface}
        translate={t}
      />
    );
  }

  return (
    <Box
      className="aiq-product-shell"
      data-gds-theme-preset={ATHLETE_IQ_GDS_THEME_PRESET}
      data-mantine-color-scheme="dark"
      style={ATHLETE_IQ_THEME_VARIABLES}
    >
      <Box className="aiq-workspace" px={{ base: "md", md: "xl" }} py={{ base: "md", md: "xl" }} maw={1480} mx="auto">
        {/* When embedded inside the shared shell (DashboardShell), that shell owns
            the single persona menu — so suppress this surface's own top bars,
            mobile drawer, and desktop sidebar to avoid a second menu (#unify-nav). */}
        {!embedded && <SurfaceTopBar surface={surface} />}
        {!embedded && (
          <AiqMobileTopBar
            common={common}
            kicker={t("sidebar.kicker")}
            menuOpened={mobileMenuOpened}
            productName={t("surfaceName")}
            onToggleMenu={() => setMobileMenuOpened((opened) => !opened)}
          />
        )}
        {!embedded && (
          <AiqMobileNavigation
            common={common}
            kicker={t("sidebar.kicker")}
            navGroups={visibleNavigationGroups}
            opened={mobileMenuOpened}
            persona={dashboard.persona}
            productName={t("surfaceName")}
            translate={t}
            onClose={() => setMobileMenuOpened(false)}
          />
        )}

        <Box className={embedded ? "aiq-command-layout aiq-command-layout-embedded" : "aiq-command-layout"}>
          {!embedded && (
          <Paper component="aside" className="aiq-sidebar-v2 aiq-desktop-sidebar surface-outline" withBorder radius="md" p="lg">
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
                  <AiqNavSection key={group.id} group={group} translate={t} />
                ))}
                <AiqDailyScoreCard mode={modeView} score={formatScore(dailyIq, false)} translate={t} />
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
          )}

          <Stack gap="md" component="main">
            <Paper id="home" component="section" className="aiq-hero-panel surface-outline" withBorder radius="md" p={{ base: "lg", md: "xl" }}>
              <SimpleGrid cols={{ base: 1, lg: 2 }} spacing={{ base: "lg", lg: "xl" }}>
                <Stack gap="lg">
                  <Group justify="space-between" align="center" gap="sm" wrap="wrap">
                    <Text className="aiq-letter-label">{t("hero.dateLabel", { date: dashboard.localDate })}</Text>
                    <PersonaIndicator dashboard={dashboard} translate={t} />
                  </Group>
                  <PageHeader
                    title={t("hero.title")}
                    subtitle={t(selectCopyKey(heroSubtitleDef("hero.subtitle"), { now: heroNowMs }))}
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
                  <MetricCard label={t("metrics.dailyIq")} value={formatScore(dailyIq, false)} detail={t(`metrics.${modeView}Route`)} />
                  <MetricCard label={t("metrics.readiness")} value={formatScore(teamReadiness)} detail={t("metrics.teamSnapshot")} />
                  <MetricCard label={t("metrics.mentalEdge")} value={formatScore(mentalAverage)} detail={t("metrics.priorityAthletes")} />
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
                  {dashboard.operations.map((operation) => (
                    <TeamOperationCard key={operation.id} operation={operation} translate={t} />
                  ))}
                </SimpleGrid>
                <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
                  <SignalCard label={t("signals.openPriorities.label")} value={String(activeQueue.length)} state={activeQueue.length > 0 ? "watch" : "good"} detail={t("signals.openPriorities.detail")} inverse />
                  <SignalCard label={t("signals.queueAverage.label")} value={formatScore(queueScore)} state={queueScore !== null && queueScore < 60 ? "risk" : queueScore !== null && queueScore < 75 ? "watch" : "good"} detail={t("signals.queueAverage.detail")} inverse />
                  <SignalCard label={t("signals.readyServices.label")} value={`${readyServices}/${dashboard.services.length}`} state={readyServices === dashboard.services.length ? "good" : "watch"} detail={t("signals.readyServices.detail")} inverse />
                </SimpleGrid>
              </Stack>
            </Paper>

            <SimpleGrid cols={{ base: 1, lg: 3 }} spacing="md">
              <Paper id="priority" component="section" className="aiq-panel surface-outline" withBorder radius="md" p="lg">
                <Stack gap="md">
                  <SectionHeading icon={<GdsIcons.Dashboard size={18} />} title={t("priority.title")} copy={t("priority.copy")} inverse />
                  {activeQueue.length > 0 ? (
                    <Box style={{ overflowX: "auto", maxWidth: "100%" }}>
                      <SegmentedControl
                        size="sm"
                        value={priorityFilter}
                        onChange={(value) => setPriorityFilter(value as typeof priorityFilter)}
                        data={[
                          { value: "all", label: t("priority.filter.all") },
                          { value: "risk", label: t("states.risk") },
                          { value: "watch", label: t("states.watch") },
                          { value: "missing", label: t("states.missing") },
                        ]}
                      />
                    </Box>
                  ) : null}
                  {activeQueue.length === 0 ? <Text className="aiq-muted">{t(selectCopyKey(neutralPromptDef("priority.empty"), { now: heroNowMs }))}</Text> : null}
                  {activeQueue.length > 0 && filteredQueue.length === 0 ? <Text className="aiq-muted">{t("priority.filterNoMatch")}</Text> : null}
                  {filteredQueue.map((athlete) => (
                    <PriorityAthleteCard
                      key={athlete.id}
                      athlete={athlete}
                      acknowledged={acknowledged.includes(athlete.id)}
                      actionPack={actionPack}
                      onAcknowledge={acknowledge}
                      saving={savingAcknowledgement === athlete.id}
                      nowMs={heroNowMs}
                      translate={t}
                    />
                  ))}
                </Stack>
              </Paper>

              <Paper id="athletes" component="section" className="aiq-panel surface-outline" withBorder radius="md" p="lg">
                <Stack gap="md">
                  <SectionHeading icon={<GdsIcons.Profile size={18} />} title={roleView === "academy" ? t("athletes.academyTitle") : t("athletes.title")} copy={t("athletes.copy")} inverse />
                  {dashboard.athletes.map((athlete) => (
                    <AiqReadinessRow key={athlete.id} athlete={athlete} translate={t} />
                  ))}
                </Stack>
              </Paper>

              <Paper id="services" component="section" className="aiq-panel surface-outline" withBorder radius="md" p="lg">
                <Stack gap="md">
                  <SectionHeading icon={<GdsIcons.Record size={18} />} title={t("services.title")} copy={t("services.copy")} inverse />
                  {dashboard.services.map((module) => (
                    <ServiceModuleCard key={module.id} module={module} actionPack={actionPack} translate={t} onOpen={openServiceModule} />
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

function AiqAthleteWorkspace({
  actionPack,
  dashboard,
  embedded = false,
  modeOptions,
  modeView,
  setModeView,
  surface,
  translate
}: {
  actionPack: ProductSurfaceActionPack;
  dashboard: AthleteIqProductDashboardProjection;
  embedded?: boolean;
  modeOptions: Array<{ label: string; value: string }>;
  modeView: "lifestyle" | "performance";
  setModeView: (value: "lifestyle" | "performance") => void;
  surface: ProductSurface;
  translate: AiqTranslate;
}) {
  const athlete = dashboard.athletes[0] ?? null;
  const common = useTranslations("Common");
  const [mobileMenuOpened, setMobileMenuOpened] = useState(false);
  const [heroNowMs] = useState(Date.now);
  const athleteNavigationGroups = useMemo<AiqNavGroup[]>(
    () => [
      {
        id: "dailyOs",
        items: [
          { anchorId: "home", active: true, labelKey: "home" },
          { anchorId: "checkin", labelKey: "checkin" },
          { anchorId: "plan", labelKey: "plan" },
          { anchorId: "sessions", labelKey: "sessions" },
          { anchorId: "mental", labelKey: "mental" },
          { anchorId: "reflection", labelKey: "reflection" },
          { anchorId: "progress", labelKey: "progress" },
          { anchorId: "lite", labelKey: "lite" },
          { anchorId: "shared-data", labelKey: "habits" }
        ]
      }
    ],
    []
  );
  const supportQueue = dashboard.activeQueue;
  const readiness = athlete?.readiness ?? dashboard.averageReadiness;
  const mental = athlete?.mental ?? dashboard.averageMental;
  const recorderLabels = useMemo<SharedDailyRecorderLabels>(
    () => ({
      checkIn: {
        completeAll: translate("athleteWorkspace.recorder.checkIn.completeAll"),
        energy: translate("athleteWorkspace.recorder.checkIn.energy"),
        mood: translate("athleteWorkspace.recorder.checkIn.mood"),
        sleep: translate("athleteWorkspace.recorder.checkIn.sleep"),
        soreness: translate("athleteWorkspace.recorder.checkIn.soreness"),
        unset: translate("athleteWorkspace.recorder.checkIn.unset")
      },
      errors: {
        loadFailed: translate("athleteWorkspace.recorder.errors.loadFailed"),
        profileRequired: translate("athleteWorkspace.recorder.errors.profileRequired"),
        saveFailed: translate("athleteWorkspace.recorder.errors.saveFailed"),
        sessionExpired: translate("athleteWorkspace.recorder.errors.sessionExpired"),
        title: translate("athleteWorkspace.recorder.errors.title")
      },
      habits: {
        categories: {
          fuel: translate("athleteWorkspace.recorder.habits.categories.fuel"),
          life: translate("athleteWorkspace.recorder.habits.categories.life"),
          mental: translate("athleteWorkspace.recorder.habits.categories.mental"),
          recovery: translate("athleteWorkspace.recorder.habits.categories.recovery"),
          sport: translate("athleteWorkspace.recorder.habits.categories.sport")
        },
        completion: translate("athleteWorkspace.recorder.habits.completion"),
        confirmRequired: translate("athleteWorkspace.recorder.habits.confirmRequired"),
        copy: translate("athleteWorkspace.recorder.habits.copy"),
        itemLabel: translate("athleteWorkspace.recorder.habits.itemLabel"),
        items: {
          fuel: translate("athleteWorkspace.recorder.habits.items.fuel"),
          hydrate: translate("athleteWorkspace.recorder.habits.items.hydrate"),
          move: translate("athleteWorkspace.recorder.habits.items.move"),
          reflect: translate("athleteWorkspace.recorder.habits.items.reflect"),
          sleep: translate("athleteWorkspace.recorder.habits.items.sleep"),
          study: translate("athleteWorkspace.recorder.habits.items.study")
        },
        reviewed: translate("athleteWorkspace.recorder.habits.reviewed"),
        title: translate("athleteWorkspace.recorder.habits.title")
      },
      reference: translate("athleteWorkspace.recorder.reference", { correlationId: "{correlationId}" }),
      saved: translate("athleteWorkspace.recorder.saved"),
      savedTitle: translate("athleteWorkspace.recorder.savedTitle")
    }),
    [translate]
  );
  const habitDetail = athlete
    ? `${translate("athletes.habitsLabel")} ${athlete.habigoalDaily.habitCompletion} · ${translate(`athletes.habigoalCompletion.${athlete.habigoalDaily.completionState}`)}`
    : translate(selectCopyKey(neutralPromptDef("athleteWorkspace.empty.copy"), { now: heroNowMs }));

  return (
    <Box
      className="aiq-product-shell"
      data-gds-theme-preset={ATHLETE_IQ_GDS_THEME_PRESET}
      data-mantine-color-scheme="dark"
      style={ATHLETE_IQ_THEME_VARIABLES}
    >
      <Box className="aiq-workspace" px={{ base: "md", md: "xl" }} py={{ base: "md", md: "xl" }} maw={1480} mx="auto">
        {/* When embedded inside the shared shell (DashboardShell), that shell owns
            the single persona menu — so suppress this surface's own top bars,
            mobile drawer, and desktop sidebar to avoid a second menu (#unify-nav). */}
        {!embedded && <SurfaceTopBar surface={surface} />}
        {!embedded && (
          <AiqMobileTopBar
            common={common}
            kicker={translate("athleteWorkspace.sidebarKicker")}
            menuOpened={mobileMenuOpened}
            productName={translate("surfaceName")}
            onToggleMenu={() => setMobileMenuOpened((opened) => !opened)}
          />
        )}
        {!embedded && (
          <AiqMobileNavigation
            common={common}
            kicker={translate("athleteWorkspace.sidebarKicker")}
            navGroups={athleteNavigationGroups}
            opened={mobileMenuOpened}
            persona={dashboard.persona}
            productName={translate("surfaceName")}
            translate={translate}
            onClose={() => setMobileMenuOpened(false)}
          />
        )}

        <Box className={embedded ? "aiq-command-layout aiq-command-layout-embedded" : "aiq-command-layout"}>
          {!embedded && (
          <Paper component="aside" className="aiq-sidebar-v2 aiq-desktop-sidebar surface-outline" withBorder radius="md" p="lg">
            <Stack gap="xl">
              <Group gap="md" wrap="nowrap">
                <Image src={ATHLETE_IQ_GOLD_LOGO_SRC} alt="" width={88} height={78} priority className="aiq-brand-logo" />
                <Stack gap={0}>
                  <Title order={1} size="h2">AthleteIQ</Title>
                  <Text className="aiq-letter-label">{translate("athleteWorkspace.sidebarKicker")}</Text>
                </Stack>
              </Group>
              <Stack gap={6}>
                {athleteNavigationGroups[0].items.map((item) => (
                  <a key={item.anchorId} href={`#${item.anchorId}`} className={item.active ? "aiq-nav-link aiq-nav-link-active" : "aiq-nav-link"}>
                    <span>{translate(`nav.modules.${item.labelKey}`)}</span>
                  </a>
                ))}
              </Stack>
              <AiqDailyScoreCard mode={modeView} score={formatScore(dashboard.dailyIqAverage, false)} translate={translate} />
              <Paper className="aiq-mode-card surface-outline" withBorder radius="md" p="md">
                <Stack gap="xs">
                  <Text className="aiq-letter-label">{translate("controls.mode.label")}</Text>
                  <SegmentedControl
                    value={modeView}
                    onChange={(value) => setModeView(value as "lifestyle" | "performance")}
                    data={modeOptions}
                    aria-label={translate("controls.mode.aria")}
                    fullWidth
                  />
                </Stack>
              </Paper>
            </Stack>
          </Paper>
          )}

          <Stack gap="md" component="main">
            <DailyReminders />
            <Paper id="home" component="section" className="aiq-hero-panel surface-outline" withBorder radius="md" p={{ base: "lg", md: "xl" }}>
              <SimpleGrid cols={{ base: 1, lg: 2 }} spacing={{ base: "lg", lg: "xl" }}>
                <Stack gap="lg">
                  <Group justify="space-between" align="center" gap="sm" wrap="wrap">
                    <Text className="aiq-letter-label">{translate("hero.dateLabel", { date: dashboard.localDate })}</Text>
                    <PersonaIndicator dashboard={dashboard} translate={translate} />
                  </Group>
                  <PageHeader
                    title={translate("athleteWorkspace.hero.title")}
                    subtitle={translate(selectCopyKey(heroSubtitleDef("athleteWorkspace.hero.subtitle"), { now: heroNowMs }))}
                    actions={
                      <SemanticButton
                        action="productSurface:launch"
                        color="yellow"
                        onClick={() => document.getElementById("checkin")?.scrollIntoView({ behavior: "smooth", block: "start" })}
                        vocabularyPacks={[actionPack]}
                      />
                    }
                  />
                  <Text className="aiq-command-copy" size="lg">
                    {translate("athleteWorkspace.hero.copy")}
                  </Text>
                </Stack>

                <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm" aria-label={translate("athleteWorkspace.summaryAria")}>
                  <MetricCard label={translate("metrics.dailyIq")} value={formatScore(dashboard.dailyIqAverage, false)} detail={translate(`metrics.${modeView}Route`)} />
                  <MetricCard label={translate("metrics.readiness")} value={formatScore(readiness)} detail={translate("athleteWorkspace.metrics.ownReadiness")} />
                  <MetricCard label={translate("metrics.mentalEdge")} value={formatScore(mental)} detail={translate("athleteWorkspace.metrics.ownMental")} />
                </SimpleGrid>
              </SimpleGrid>
            </Paper>

            <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
              <Paper id="checkin" component="section" className="aiq-panel surface-outline" withBorder radius="md" p="lg">
                <Stack gap="md">
                  <SectionHeading icon={<GdsIcons.Profile size={18} />} title={translate("athleteWorkspace.today.title")} copy={translate("athleteWorkspace.today.copy")} inverse />
                  {athlete ? (
                    <Stack gap="sm">
                      <AiqReadinessRow athlete={athlete} translate={translate} />
                      <SignalCard label={translate("athleteWorkspace.today.teamLabel")} value={athlete.teamName ?? translate("athletes.unassignedTeam")} state={athlete.teamName ? "good" : "watch"} detail={habitDetail} inverse />
                      <SharedDailyRecorder
                        actionPack={actionPack}
                        athleteId={athlete.id}
                        labels={recorderLabels}
                        localDate={dashboard.localDate}
                        product="athlete-iq"
                        timezone={dashboard.timezone}
                        variant="aiq"
                      />
                    </Stack>
                  ) : (
                    <Text className="aiq-muted">{translate(selectCopyKey(neutralPromptDef("athleteWorkspace.empty.copy"), { now: heroNowMs }))}</Text>
                  )}
                </Stack>
              </Paper>

              <Paper id="calendar" component="section" className="aiq-panel surface-outline" withBorder radius="md" p="lg">
                <Stack gap="md">
                  <SectionHeading icon={<GdsIcons.Record size={18} />} title={translate("athleteWorkspace.support.title")} copy={translate("athleteWorkspace.support.copy")} inverse />
                  {supportQueue.length === 0 ? <Text className="aiq-muted">{translate(selectCopyKey(neutralPromptDef("athleteWorkspace.support.empty"), { now: heroNowMs }))}</Text> : null}
                  {supportQueue.map((item) => (
                    <Box key={item.id} className="aiq-row-card">
                      <Stack gap="xs">
                        <Group justify="space-between" gap="sm">
                          <Text fw={900}>{item.name}</Text>
                          <Badge color={item.severity === "risk" ? "red" : item.severity === "watch" ? "yellow" : "gray"} variant="light">
                            {translate(`states.${item.severity}`)}
                          </Badge>
                        </Group>
                        <Text size="sm">{translate(selectCopyKey(neutralPromptDef(`priority.reasons.${item.reasonKey}`), { now: heroNowMs, seed: item.id }))}</Text>
                        <Text size="sm" className="aiq-muted">{translate(`priority.actions.${item.actionKey}`)}</Text>
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              </Paper>
            </SimpleGrid>

            {athlete ? (
              <>
                <Paper id="plan" component="section" className="aiq-panel surface-outline" withBorder radius="md" p="lg">
                  <Stack gap="md">
                    <SectionHeading icon={<GdsIcons.Dashboard size={18} />} title={translate("athleteWorkspace.sections.plan.title")} copy={translate("athleteWorkspace.sections.plan.copy")} inverse />
                    <AiqDailyPlanPanel athleteId={athlete.id} localDate={dashboard.localDate} timezone={dashboard.timezone} />
                  </Stack>
                </Paper>

                <Paper id="sessions" component="section" className="aiq-panel surface-outline" withBorder radius="md" p="lg">
                  <Stack gap="md">
                    <SectionHeading icon={<GdsIcons.Record size={18} />} title={translate("athleteWorkspace.sections.sessions.title")} copy={translate("athleteWorkspace.sections.sessions.copy")} inverse />
                    <AiqSessionPanel athleteId={athlete.id} localDate={dashboard.localDate} timezone={dashboard.timezone} />
                  </Stack>
                </Paper>

                <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
                  <Paper id="mental" component="section" className="aiq-panel surface-outline" withBorder radius="md" p="lg">
                    <Stack gap="md">
                      <SectionHeading icon={<GdsIcons.Profile size={18} />} title={translate("athleteWorkspace.sections.mental.title")} copy={translate("athleteWorkspace.sections.mental.copy")} inverse />
                      <AiqMentalEdgePanel athleteId={athlete.id} localDate={dashboard.localDate} timezone={dashboard.timezone} />
                    </Stack>
                  </Paper>

                  <Paper id="reflection" component="section" className="aiq-panel surface-outline" withBorder radius="md" p="lg">
                    <Stack gap="md">
                      <SectionHeading icon={<GdsIcons.Record size={18} />} title={translate("athleteWorkspace.sections.reflection.title")} copy={translate("athleteWorkspace.sections.reflection.copy")} inverse />
                      <AiqReflectionPanel athleteId={athlete.id} localDate={dashboard.localDate} />
                    </Stack>
                  </Paper>
                </SimpleGrid>

                <Paper id="progress" component="section" className="aiq-panel surface-outline" withBorder radius="md" p="lg">
                  <Stack gap="md">
                    <SectionHeading icon={<GdsIcons.Dashboard size={18} />} title={translate("athleteWorkspace.sections.progress.title")} copy={translate("athleteWorkspace.sections.progress.copy")} inverse />
                    <AiqProgressPanel athleteId={athlete.id} localDate={dashboard.localDate} timezone={dashboard.timezone} />
                  </Stack>
                </Paper>

                <Paper id="lite" component="section" className="aiq-panel surface-outline" withBorder radius="md" p="lg">
                  <Stack gap="md">
                    <SectionHeading icon={<GdsIcons.Record size={18} />} title={translate("athleteWorkspace.sections.lite.title")} copy={translate("athleteWorkspace.sections.lite.copy")} inverse />
                    <AiqLiteModulesPanel athleteId={athlete.id} localDate={dashboard.localDate} timezone={dashboard.timezone} />
                  </Stack>
                </Paper>
              </>
            ) : null}

            <Paper id="shared-data" component="section" className="aiq-team-command-panel surface-outline" withBorder radius="md" p={{ base: "lg", md: "xl" }}>
              <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                <Stack gap="xs">
                  <Text className="aiq-letter-label">{translate("athleteWorkspace.shared.kicker")}</Text>
                  <Title order={2}>{translate("athleteWorkspace.shared.title")}</Title>
                  <Text className="aiq-command-copy">{translate("athleteWorkspace.shared.copy")}</Text>
                </Stack>
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                  {athlete ? (
                    <>
                      <SignalCard
                        label={translate("athletes.habigoalLabel")}
                        value={translate(`athletes.habigoalCompletion.${athlete.habigoalDaily.completionState}`)}
                        state={athlete.habigoalDaily.completionState === "complete" ? "good" : athlete.habigoalDaily.completionState === "partial" ? "watch" : "neutral"}
                        detail={`${translate("athletes.habitsLabel")} ${athlete.habigoalDaily.habitCompletion} · ${translate(`athletes.habigoalSource.${athlete.habigoalDaily.source}`)}`}
                        inverse
                      />
                      <SignalCard
                        label={translate("athleteWorkspace.today.teamLabel")}
                        value={athlete.teamName ?? translate("athletes.unassignedTeam")}
                        state={athlete.teamName ? "good" : "watch"}
                        detail={translate(`states.${athlete.severity}`)}
                        inverse
                      />
                      <SignalCard
                        label={translate("metrics.readiness")}
                        value={formatScore(readiness)}
                        state={readiness === null ? "neutral" : readiness >= 75 ? "good" : readiness >= 60 ? "watch" : "risk"}
                        detail={translate("athleteWorkspace.metrics.ownReadiness")}
                        inverse
                      />
                    </>
                  ) : (
                    <Text className="aiq-muted">{translate(selectCopyKey(neutralPromptDef("athleteWorkspace.empty.copy"), { now: heroNowMs }))}</Text>
                  )}
                </SimpleGrid>
              </SimpleGrid>
            </Paper>
          </Stack>
        </Box>
      </Box>
    </Box>
  );
}

// Multi-role accounts (e.g. a coach who is also a registered athlete) can view
// either persona on this shared route. Without this indicator the athlete
// self-service workspace can render for a trainer-capable account with no
// visible cue why, and no way back (#persona-indicator).
function PersonaIndicator({ dashboard, translate }: { dashboard: AthleteIqProductDashboardProjection; translate: AiqTranslate }) {
  const locale = useLocale() as SupportedLocale;
  const pathname = usePathname();
  const router = useRouter();
  const otherPersona = dashboard.persona === "athlete" ? "trainer" : "athlete";
  const canSwitch = dashboard.availablePersonas.includes(otherPersona);

  function switchTo(next: "athlete" | "trainer") {
    const cleanPath = pathname.replace(/^\/(en|hu|ar|es|de|he)(\/|$)/, "/");
    router.push(`${cleanPath}?persona=${next}`, { locale });
  }

  return (
    <Group gap="xs" wrap="wrap" className="aiq-persona-indicator">
      <Badge color={dashboard.persona === "athlete" ? "yellow" : "tactical"} variant="light">
        {translate(`personaIndicator.current.${dashboard.persona}`)}
      </Badge>
      {canSwitch ? (
        <Button variant="subtle" color="yellow" size="sm" onClick={() => switchTo(otherPersona)}>
          {translate(`personaIndicator.switchTo.${otherPersona}`)}
        </Button>
      ) : null}
    </Group>
  );
}

function TeamOperationCard({ operation, translate }: { operation: AthleteIqDashboardOperation; translate: AiqTranslate }) {
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

function AiqMobileTopBar({
  common,
  kicker,
  menuOpened,
  productName,
  onToggleMenu
}: {
  common: CommonTranslate;
  kicker: string;
  menuOpened: boolean;
  productName: string;
  onToggleMenu: () => void;
}) {
  const Icon = menuOpened ? GdsIcons.Close : GdsIcons.Menu;
  return (
    <Box className="aiq-mobile-topbar">
      <Group gap="sm" wrap="nowrap" className="aiq-mobile-brand">
        <Image src={ATHLETE_IQ_GOLD_LOGO_SRC} alt="" width={54} height={48} priority className="aiq-mobile-logo" />
        <Stack gap={0}>
          <Text fw={950} className="aiq-mobile-title">{productName}</Text>
          <Text className="aiq-letter-label">{kicker}</Text>
        </Stack>
      </Group>
      <button
        type="button"
        className="aiq-mobile-menu-button"
        aria-controls="aiq-mobile-navigation"
        aria-expanded={menuOpened}
        aria-label={common("menu")}
        title={common("menu")}
        onClick={onToggleMenu}
      >
        <Icon size={22} aria-hidden="true" />
      </button>
    </Box>
  );
}

function AiqMobileNavigation({
  common,
  kicker,
  navGroups,
  onClose,
  opened,
  persona,
  productName,
  translate
}: {
  common: CommonTranslate;
  kicker: string;
  navGroups: AiqNavGroup[];
  onClose: () => void;
  opened: boolean;
  persona: AiqPersona;
  productName: string;
  translate: AiqTranslate;
}) {
  const locale = useLocale() as SupportedLocale;
  const pathname = usePathname();
  const router = useRouter();
  const dashboardHref = persona === "athlete" ? `/${locale}/athletes` : `/${locale}/dashboard`;
  const languageOptions: Array<{ label: string; value: SupportedLocale }> = [
    { label: common("languageEnglish"), value: "en" },
    { label: common("languageHungarian"), value: "hu" },
    { label: common("languageArabic"), value: "ar" },
    { label: common("languageSpanish"), value: "es" },
    { label: common("languageGerman"), value: "de" },
    { label: common("languageHebrew"), value: "he" }
  ];

  function switchLocale(nextLocale: SupportedLocale) {
    const cleanPath = pathname.replace(/^\/(en|hu|ar|es|de|he)(\/|$)/, "/");
    router.replace(cleanPath, { locale: nextLocale });
    onClose();
  }

  if (!opened) return null;

  return (
    <>
      <button type="button" className="aiq-mobile-menu-backdrop" aria-label={common("cancel")} onClick={onClose} />
      <Box id="aiq-mobile-navigation" component="aside" className="aiq-mobile-drawer" aria-label={common("menu")}>
        <Group justify="space-between" align="flex-start" gap="md" wrap="nowrap" className="aiq-mobile-drawer-header">
          <Group gap="sm" wrap="nowrap">
            <Image src={ATHLETE_IQ_GOLD_LOGO_SRC} alt="" width={58} height={52} priority className="aiq-mobile-logo" />
            <Stack gap={0}>
              <Text fw={950} className="aiq-mobile-title">{productName}</Text>
              <Text className="aiq-letter-label">{kicker}</Text>
            </Stack>
          </Group>
          <button type="button" className="aiq-mobile-menu-button" aria-label={common("cancel")} onClick={onClose}>
            <GdsIcons.Close size={22} aria-hidden="true" />
          </button>
        </Group>

        <Stack gap="lg" component="nav" aria-label={common("menu")}>
          {navGroups.map((group) => (
            <AiqNavSection key={group.id} group={group} translate={translate} onNavigate={onClose} />
          ))}
        </Stack>

        <Stack gap="sm" className="aiq-mobile-utilities">
          <a href={dashboardHref} className="aiq-mobile-utility-link" onClick={onClose}>
            <GdsIcons.Dashboard size={16} aria-hidden="true" />
            <span>{common("openDashboard")}</span>
          </a>
          <button type="button" className="aiq-mobile-utility-link" onClick={() => globalThis.location.assign("/api/auth/logout")}>
            <GdsIcons.Back size={16} aria-hidden="true" />
            <span>{common("logout")}</span>
          </button>
          <label className="aiq-mobile-language-field">
            <span>{common("languageSelector")}</span>
            <select
              value={locale}
              className="aiq-mobile-language-select"
              aria-label={common("languageSelector")}
              onChange={(event) => switchLocale(event.currentTarget.value as SupportedLocale)}
            >
              {languageOptions.map((language) => (
                <option key={language.value} value={language.value}>
                  {language.label}
                </option>
              ))}
            </select>
          </label>
        </Stack>
      </Box>
    </>
  );
}

function AiqNavSection({ group, onNavigate, translate }: { group: AiqNavGroup; onNavigate?: () => void; translate: AiqTranslate }) {
  return (
    <Stack gap="xs">
      <Text className="aiq-letter-label">{translate(`nav.groups.${group.id}`)}</Text>
      <Stack gap={6}>
        {group.items.map((item) => (
          <a key={item.anchorId} href={item.href ?? `#${item.anchorId}`} className={item.active ? "aiq-nav-link aiq-nav-link-active" : "aiq-nav-link"} onClick={onNavigate}>
            <span>{translate(`nav.modules.${item.labelKey}`)}</span>
          </a>
        ))}
      </Stack>
    </Stack>
  );
}

function AiqDailyScoreCard({ mode, score, translate }: { mode: "lifestyle" | "performance"; score: string; translate: AiqTranslate }) {
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
  saving,
  nowMs,
  translate
}: {
  actionPack: ProductSurfaceActionPack;
  acknowledged: boolean;
  athlete: AthleteIqDashboardAthlete;
  onAcknowledge: (athlete: AthleteIqDashboardAthlete) => void;
  saving: boolean;
  nowMs: number;
  translate: AiqTranslate;
}) {
  const color = athlete.severity === "risk" ? "red" : athlete.severity === "watch" ? "yellow" : athlete.severity === "missing" ? "gray" : "tactical";

  return (
    <Box className={acknowledged ? "aiq-row-card aiq-row-card-muted" : "aiq-row-card"}>
      <Stack gap="sm">
        <Group justify="space-between" align="flex-start" gap="sm">
          <Stack gap={2}>
            <Text fw={900}>{athlete.name}</Text>
            <Text size="sm" className="aiq-muted-soft">{athlete.teamName ?? translate("athletes.unassignedTeam")}</Text>
          </Stack>
          <Badge color={acknowledged ? "gray" : color} variant="light">{acknowledged ? translate("states.acknowledged") : translate(`states.${athlete.severity}`)}</Badge>
        </Group>
        <Text size="sm">{translate(selectCopyKey(neutralPromptDef(`priority.reasons.${athlete.reasonKey}`), { now: nowMs, seed: athlete.id }))}</Text>
        <Text size="sm" className="aiq-muted"><strong>{translate("priority.actionLabel")}:</strong> {translate(`priority.actions.${athlete.actionKey}`)}</Text>
        <Text size="sm" className="aiq-muted-faint">{translate("priority.sourceLabel")}: {translate(`priority.sources.${athlete.sourceKey}`)}</Text>
        <SemanticButton
          action="productSurface:acknowledge"
          color="yellow"
          size="sm"
          variant={acknowledged ? "default" : "light"}
          vocabularyPacks={[actionPack]}
          onClick={() => onAcknowledge(athlete)}
          disabled={acknowledged || saving}
          loading={saving}
        />
      </Stack>
    </Box>
  );
}

function recommendationKeyForAthlete(athlete: AthleteIqDashboardAthlete) {
  if (athlete.reasonKey === "painAlert") return "athleteiq.pain_safety.review";
  if (athlete.reasonKey === "missingDailyIq") return "athleteiq.daily_engine.missing_data";
  if (athlete.reasonKey === "dailyIqRisk") return "athleteiq.readiness_route.review";
  return "athleteiq.daily_plan.continue";
}

function AiqReadinessRow({ athlete, translate }: { athlete: AthleteIqDashboardAthlete; translate: AiqTranslate }) {
  const readiness = athlete.readiness ?? 0;
  return (
    <Box className="aiq-row-card">
      <Stack gap="xs">
        <Group justify="space-between">
          <Text fw={900}>{athlete.name}</Text>
          <Text fw={900}>{formatScore(athlete.readiness)}</Text>
        </Group>
        <Progress.Root size="lg" radius="xl">
          <Progress.Section value={readiness} color={readiness >= 75 ? "tactical" : readiness >= 60 ? "yellow" : "red"} />
        </Progress.Root>
        <SimpleGrid cols={2} spacing={6}>
          <Text size="sm" className="aiq-muted-soft">{translate("athletes.loadLabel")} {formatScore(athlete.load)}</Text>
          <Text size="sm" className="aiq-muted-soft">{translate("athletes.mentalLabel")} {formatScore(athlete.mental)}</Text>
        </SimpleGrid>
        <Text size="sm" className="aiq-muted-faint">
          {translate("athletes.habigoalLabel")}: {translate(`athletes.habigoalCompletion.${athlete.habigoalDaily.completionState}`)} · {translate("athletes.habitsLabel")} {athlete.habigoalDaily.habitCompletion} · {translate(`athletes.habigoalSource.${athlete.habigoalDaily.source}`)}
        </Text>
      </Stack>
    </Box>
  );
}

function ServiceModuleCard({
  actionPack,
  module,
  onOpen,
  translate
}: {
  actionPack: ProductSurfaceActionPack;
  module: AthleteIqDashboardService;
  onOpen: (module: AthleteIqDashboardService) => void;
  translate: AiqTranslate;
}) {
  const color = module.status === "ready" ? "tactical" : module.status === "missing" ? "gray" : "yellow";
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
          onClick={() => onOpen(module)}
        />
      </Stack>
    </Box>
  );
}

function getTrainerServiceRoute(moduleId: AthleteIqDashboardService["id"]) {
  return (
    moduleId === "daily-plan-coverage" ? "/dashboard/planning" :
    moduleId === "daily-iq-coverage" ? "/dashboard/assessment" :
    moduleId === "coach-action-queue" ? "/dashboard/coach" :
    "/dashboard/athletes"
  );
}

function formatScore(value: number | null, suffix = true) {
  if (value === null) return "-";
  return suffix ? `${value}%` : String(value);
}

function averageScore(values: number[]) {
  if (values.length === 0) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function isNumber(value: number | null): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
