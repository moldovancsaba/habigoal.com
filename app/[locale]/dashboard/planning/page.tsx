"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert, Badge, Box, Group, Loader, Paper, Select, SimpleGrid, Stack, Text, Textarea } from "@mantine/core";
import { PageHeader, SectionPanel, SemanticButton } from "@doneisbetter/gds/client";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { athleteIqPillars, getReadinessMode } from "@/lib/readiness-model";
import { getCompatiblePillarScore, getCompatibleReadinessScore, getCompatibleReadinessState } from "@/lib/assessment-compat";
import { DEFAULT_HABIGOAL_SETTINGS, type HabigoalSettings } from "@/services/settings-service";
import type { AthleteProfile } from "@/types/athlete";
import type { CheckInRecord } from "@/types/check-in";
import type { User } from "@/services/user-service";
import type { SessionPlanRecord, SessionPlanVariant } from "@/types/session-plan";

type PlanningData = {
  athletes: AthleteProfile[];
  checkIns: CheckInRecord[];
  settings: HabigoalSettings;
  users: User[];
};

type PlanningAthlete = {
  athlete: AthleteProfile;
  latestCheckIn: CheckInRecord | null;
  checkedInToday: boolean;
  location: string;
  readinessScore: number;
  supportLevel: "support" | "watch" | "ready";
  supportAreas: string[];
  internalLoad: number;
};

type WeekPlanDay = {
  isoDate: string;
  label: string;
  variant: SessionPlanVariant;
  focus: string;
  loadTarget: string;
  coachNote: string;
  athleteNames: string[];
};

export default function PlanningPage() {
  const locale = useLocale();
  const t = useTranslations("Dashboard");
  const ta = useTranslations("Assessment");
  const tc = useTranslations("Common");
  const [data, setData] = useState<PlanningData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [notesByDate, setNotesByDate] = useState<Record<string, string>>({});
  const [savedPlan, setSavedPlan] = useState<SessionPlanRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saved" | "error">("idle");

  useEffect(() => {
    void Promise.all([
      fetch("/api/athletes?metrics=true").then((r) => r.json() as Promise<AthleteProfile[]>),
      fetch("/api/check-ins").then((r) => r.json() as Promise<{ assessments: CheckInRecord[] }>),
      fetch("/api/settings").then((r) => r.json() as Promise<HabigoalSettings>),
      fetch("/api/users").then((r) => r.json() as Promise<{ users: User[] }>)
    ])
      .then(([athletes, checkIns, settings, users]) => {
        setData({
          athletes: Array.isArray(athletes) ? athletes : [],
          checkIns: checkIns.assessments ?? [],
          settings: {
            ...DEFAULT_HABIGOAL_SETTINGS,
            ...settings,
            alerting: {
              ...DEFAULT_HABIGOAL_SETTINGS.alerting,
              ...(settings?.alerting ?? {})
            }
          },
          users: users.users ?? []
        });
      })
      .catch(() => {
        setData({
          athletes: [],
          checkIns: [],
          settings: DEFAULT_HABIGOAL_SETTINGS,
          users: []
        });
      })
      .finally(() => setLoading(false));
  }, []);

  const latestCheckInByAthlete = useMemo(() => {
    const latest = new Map<string, CheckInRecord>();

    for (const checkIn of data?.checkIns ?? []) {
      const athleteKey = checkIn.childId || `${checkIn.child.name}|${checkIn.child.birthDate}`;
      const current = latest.get(athleteKey);
      if (!current || new Date(checkIn.createdAt).getTime() > new Date(current.createdAt).getTime()) {
        latest.set(athleteKey, checkIn);
      }
    }

    return latest;
  }, [data]);

  const planningAthletes = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const watchThreshold = data?.settings.alerting.watchReadinessThreshold ?? DEFAULT_HABIGOAL_SETTINGS.alerting.watchReadinessThreshold;
    const supportThreshold = data?.settings.alerting.supportReadinessThreshold ?? DEFAULT_HABIGOAL_SETTINGS.alerting.supportReadinessThreshold;

    return (data?.athletes ?? []).map((athlete): PlanningAthlete => {
      const athleteKey = athlete._id || `${athlete.name}|${athlete.birthDate}`;
      const latestCheckIn = latestCheckInByAthlete.get(athleteKey) ?? null;
      const checkedInToday = latestCheckIn?.session.date === today;
      const readinessScore = latestCheckIn ? getCompatibleReadinessScore(latestCheckIn) : 0;
      const readinessState = latestCheckIn ? getCompatibleReadinessState(latestCheckIn) : { count: 0, total: 9, gaugeValue: 0 };
      const readinessMode = latestCheckIn ? getReadinessMode(readinessState.count, readinessState.total) : "light";
      const supportLevel =
        readinessScore < supportThreshold ? "support" :
        readinessScore < watchThreshold || readinessMode === "moderate" ? "watch" :
        "ready";
      const supportAreas = latestCheckIn
        ? athleteIqPillars
          .map((pillar) => ({ title: ta(pillar.title), score: getCompatiblePillarScore(latestCheckIn, pillar.key) }))
          .filter((pillar) => pillar.score < watchThreshold)
          .sort((a, b) => a.score - b.score)
          .map((pillar) => pillar.title)
        : [];

      return {
        athlete,
        latestCheckIn,
        checkedInToday,
        location: latestCheckIn?.session.location || athlete.latestLocation || tc("emptyValue"),
        readinessScore,
        supportLevel,
        supportAreas,
        internalLoad: getInternalLoad(latestCheckIn)
      };
    });
  }, [data, latestCheckInByAthlete, ta, tc]);

  const locationOptions = useMemo(() => [
    { value: "all", label: t("planningScopeAll") },
    ...Array.from(new Set(filteredNonEmpty((data?.settings.locations ?? []).concat(planningAthletes.map((item) => item.location)))))
      .sort((a, b) => a.localeCompare(b))
      .map((location) => ({ value: location, label: location }))
  ], [data, planningAthletes, t]);

  const filteredAthletes = useMemo(() => {
    if (selectedLocation === "all") {
      return planningAthletes;
    }

    return planningAthletes.filter((item) => item.location === selectedLocation);
  }, [planningAthletes, selectedLocation]);

  const blueprintVariant = useMemo(() => buildBlueprintVariant(filteredAthletes), [filteredAthletes]);
  const weekPlan = useMemo(() => buildWeekPlan(filteredAthletes, blueprintVariant, t, locale), [filteredAthletes, blueprintVariant, t, locale]);
  const weekStart = useMemo(() => getMonday(new Date()).toISOString().slice(0, 10), []);

  const supportCount = filteredAthletes.filter((item) => item.supportLevel === "support").length;
  const watchCount = filteredAthletes.filter((item) => item.supportLevel === "watch").length;
  const missingCount = filteredAthletes.filter((item) => !item.checkedInToday).length;
  const athletesWithLoad = filteredAthletes.filter((item) => item.internalLoad > 0);
  const averageLoad = athletesWithLoad.length > 0
    ? athletesWithLoad.reduce((sum, item) => sum + item.internalLoad, 0) / athletesWithLoad.length
    : 0;

  const priorityAthletes = filteredAthletes
    .filter((item) => item.supportLevel !== "ready" || !item.checkedInToday)
    .sort((a, b) => {
      const weightA = getSupportWeight(a.supportLevel) + Number(!a.checkedInToday) * 2;
      const weightB = getSupportWeight(b.supportLevel) + Number(!b.checkedInToday) * 2;
      if (weightB !== weightA) return weightB - weightA;
      return a.athlete.name.localeCompare(b.athlete.name);
    })
    .slice(0, 6);

  const conductors = data?.settings.conductors ?? [];
  const observers = data?.settings.observers ?? [];
  const editableDays = useMemo(
    () => weekPlan.map((day) => {
      const savedDay = savedPlan?.days.find((entry) => entry.isoDate === day.isoDate);
      return {
        ...day,
        coachNote: notesByDate[day.isoDate] ?? savedDay?.coachNote ?? day.coachNote
      };
    }),
    [notesByDate, savedPlan, weekPlan]
  );

  useEffect(() => {
    let active = true;

    void fetch(`/api/session-plans?weekStart=${weekStart}&scope=${encodeURIComponent(selectedLocation)}`)
      .then((response) => response.ok ? response.json() as Promise<{ plan: SessionPlanRecord | null }> : Promise.resolve({ plan: null }))
      .then((payload) => {
        if (!active) return;
        setSavedPlan(payload.plan ?? null);
        setNotesByDate({});
      })
      .catch(() => {
        if (!active) return;
        setSavedPlan(null);
        setNotesByDate({});
      });

    return () => {
      active = false;
    };
  }, [selectedLocation, weekStart]);

  async function savePlan() {
    setSaving(true);
    setSaveState("idle");
    try {
      const response = await fetch("/api/session-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weekStart,
          scope: selectedLocation,
          variant: blueprintVariant,
          days: editableDays,
          summary: {
            totalAthletes: filteredAthletes.length,
            supportAthletes: supportCount + watchCount,
            missingCheckIns: missingCount,
            averageLoad: Math.round(averageLoad)
          }
        })
      });

      if (!response.ok) {
        throw new Error("Failed to save session plan");
      }

      const plan = await response.json() as SessionPlanRecord;
      setSavedPlan(plan);
      setSaveState("saved");
    } catch {
      setSaveState("error");
    } finally {
      setSaving(false);
    }
  }

  function resetPlan() {
    setNotesByDate(Object.fromEntries(weekPlan.map((day) => [day.isoDate, day.coachNote])));
    setSaveState("idle");
  }

  if (loading) {
    return (
      <Box style={{ display: "flex", justifyContent: "center", paddingBlock: "2rem" }} role="status">
        <Loader aria-label={tc("loading")} />
      </Box>
    );
  }

  return (
    <Stack gap="lg">
      <PageHeader
        title={t("planningTitle")}
        subtitle={t("planningSubtitle")}
        actions={(
          <Group gap="sm" align="end" justify="flex-end" wrap="wrap">
            <Select
              value={selectedLocation}
              onChange={(value) => setSelectedLocation(value || "all")}
              data={locationOptions}
              label={t("planningLocationFilterLabel")}
              w={{ base: "100%", sm: 240 }}
            />
            <Link href="/dashboard/assessment" style={{ textDecoration: "none" }}>
              <SemanticButton action="start" color="ingress" />
            </Link>
            <SemanticButton action="reset" variant="light" onClick={resetPlan} />
            <SemanticButton action="save" onClick={savePlan} loading={saving} />
          </Group>
        )}
      />

      <SimpleGrid cols={{ base: 1, sm: 2, xl: 4 }} spacing="md">
        <MetricCard label={t("planningTotalAthletesLabel")} value={String(filteredAthletes.length)} />
        <MetricCard label={t("planningSupportAthletesLabel")} value={String(supportCount + watchCount)} tone={supportCount > 0 ? "red" : watchCount > 0 ? "yellow" : "green"} />
        <MetricCard label={t("planningMissingCheckInsLabel")} value={String(missingCount)} tone={missingCount > 0 ? "red" : "green"} />
        <MetricCard label={t("planningAvgLoadLabel")} value={String(Math.round(averageLoad))} />
      </SimpleGrid>

      <SectionPanel
        title={t("planningCalendarTitle")}
        description={t("planningCalendarSubtitle", { variant: getBlueprintLabel(blueprintVariant, t).toLowerCase() })}
      >
        {saveState === "saved" ? (
          <Alert color="tactical" mb="md">
            {t("planningSavedBanner", { actor: savedPlan?.actorName || t("brandName") })}
          </Alert>
        ) : null}
        {saveState === "error" ? (
          <Alert color="red" mb="md">
            {t("planningSaveError")}
          </Alert>
        ) : null}
        {savedPlan ? (
          <Text size="sm" c="dimmed" mb="md">
            {t("planningSavedMeta", { actor: savedPlan.actorName, updatedAt: savedPlan.updatedAt.slice(0, 10) })}
          </Text>
        ) : null}
        {filteredAthletes.length === 0 ? (
          <Text size="sm" c="dimmed">{t("planningEmpty")}</Text>
        ) : (
          <SimpleGrid cols={{ base: 1, md: 2, xl: 5 }} spacing="md">
            {editableDays.map((day) => (
              <Paper key={day.isoDate} withBorder radius="md" p="md">
                <Stack gap="sm">
                  <Group justify="space-between" align="flex-start">
                    <Box>
                      <Text fw={700}>{day.label}</Text>
                      <Text size="sm" c="dimmed">{day.isoDate}</Text>
                    </Box>
                    <Badge color={getBlueprintBadgeColor(day.variant)}>
                      {getBlueprintBadgeLabel(day.variant, t)}
                    </Badge>
                  </Group>

                  <Box>
                    <Text size="sm" tt="uppercase" c="dimmed">{t("planningDayFocusLabel")}</Text>
                    <Text size="sm">{day.focus}</Text>
                  </Box>

                  <Box>
                    <Text size="sm" tt="uppercase" c="dimmed">{t("planningDayLoadLabel")}</Text>
                    <Text size="sm">{day.loadTarget}</Text>
                  </Box>

                  <Box>
                    <Text size="sm" tt="uppercase" c="dimmed">{t("planningDayCoachLabel")}</Text>
                    <Textarea
                      value={day.coachNote}
                      onChange={(event) => {
                        const value = event.currentTarget.value;
                        setNotesByDate((current) => ({ ...current, [day.isoDate]: value }));
                        setSaveState("idle");
                      }}
                      minRows={4}
                    />
                  </Box>

                  <Box>
                    <Text size="sm" tt="uppercase" c="dimmed">{t("planningDayAthletesLabel")}</Text>
                    {day.athleteNames.length === 0 ? (
                      <Text size="sm" c="dimmed">{t("planningDayAthletesEmpty")}</Text>
                    ) : (
                      <Stack gap={4}>
                        {day.athleteNames.map((name) => (
                          <Text key={`${day.isoDate}-${name}`} size="sm">{name}</Text>
                        ))}
                      </Stack>
                    )}
                  </Box>
                </Stack>
              </Paper>
            ))}
          </SimpleGrid>
        )}
      </SectionPanel>

      <SimpleGrid cols={{ base: 1, xl: 2 }} spacing="md">
        <SectionPanel title={t("planningPriorityTitle")} description={t("planningPrioritySubtitle")}>
          {priorityAthletes.length === 0 ? (
            <Text size="sm" c="dimmed">{t("planningDayAthletesEmpty")}</Text>
          ) : (
            <Stack gap="sm">
              {priorityAthletes.map((item) => (
                <Paper key={item.athlete._id || item.athlete.name} withBorder p="md" radius="md">
                  <Group justify="space-between" align="flex-start">
                    <Box style={{ flex: 1, minWidth: 0 }}>
                      <Text fw={700}>{item.athlete.name}</Text>
                      <Text size="sm" c="dimmed">{item.location}</Text>
                      <Text size="sm">
                        {!item.checkedInToday
                          ? t("recommendationCollectDetail")
                          : item.supportAreas.length > 0
                            ? item.supportAreas.slice(0, 2).join(", ")
                            : t("recommendationMaintainDetail", { score: item.readinessScore.toFixed(2) })}
                      </Text>
                    </Box>
                    <Badge color={item.supportLevel === "support" ? "red" : item.supportLevel === "watch" ? "yellow" : "green"}>
                      {item.supportLevel === "support" ? t("actionBucketSupport") : item.supportLevel === "watch" ? t("actionBucketWatch") : t("actionBucketReady")}
                    </Badge>
                  </Group>
                </Paper>
              ))}
            </Stack>
          )}
        </SectionPanel>

        <SectionPanel title={t("planningStaffTitle")} description={t("planningStaffSubtitle")}>
          <Stack gap="md">
            <Box>
              <Text size="sm" tt="uppercase" c="dimmed">{t("planningConductorsLabel")}</Text>
              <Text size="sm">{conductors.length > 0 ? conductors.join(", ") : tc("emptyValue")}</Text>
            </Box>
            <Box>
              <Text size="sm" tt="uppercase" c="dimmed">{t("planningObserversLabel")}</Text>
              <Text size="sm">{observers.length > 0 ? observers.join(", ") : tc("emptyValue")}</Text>
            </Box>
            <Box>
              <Text size="sm" tt="uppercase" c="dimmed">{t("planningLocationsLabel")}</Text>
              <Text size="sm">
                {Array.from(new Set(filteredNonEmpty(filteredAthletes.map((item) => item.location)))).join(", ") || tc("emptyValue")}
              </Text>
            </Box>
          </Stack>
        </SectionPanel>
      </SimpleGrid>
    </Stack>
  );
}

function MetricCard({ label, value, tone = "blue" }: { label: string; value: string; tone?: "blue" | "green" | "yellow" | "red" }) {
  const borderColor =
    tone === "green" ? "var(--mantine-color-green-6)" :
    tone === "yellow" ? "var(--mantine-color-yellow-6)" :
    tone === "red" ? "var(--mantine-color-red-6)" :
    "var(--mantine-color-blue-6)";

  return (
    <Paper withBorder radius="md" p="md" style={{ borderColor }}>
      <Stack gap={2}>
        <Text size="sm" tt="uppercase" c="dimmed">{label}</Text>
        <Text fw={800} size="1.75rem">{value}</Text>
      </Stack>
    </Paper>
  );
}

function buildBlueprintVariant(athletes: PlanningAthlete[]): SessionPlanVariant {
  const supportCount = athletes.filter((item) => item.supportLevel === "support").length;
  const watchCount = athletes.filter((item) => item.supportLevel === "watch").length;
  const checkedInTodayCount = athletes.filter((item) => item.checkedInToday).length;
  const missingCount = athletes.length - checkedInTodayCount;
  const supportHeavy = supportCount >= Math.max(2, Math.ceil(athletes.length * 0.25));
  const watchHeavy = supportCount + watchCount >= Math.max(3, Math.ceil(athletes.length * 0.4));

  if (supportHeavy) return "recovery";
  if (watchHeavy || missingCount >= Math.max(2, Math.ceil(athletes.length * 0.25))) return "controlled";
  return "standard";
}

function buildWeekPlan(
  athletes: PlanningAthlete[],
  baseVariant: SessionPlanVariant,
  t: ReturnType<typeof useTranslations>,
  locale: string
): WeekPlanDay[] {
  const monday = getMonday(new Date());
  const planModes = getWeekModes(baseVariant);
  const laneKeys = ["planningLaneMon", "planningLaneTue", "planningLaneWed", "planningLaneThu", "planningLaneFri"] as const;
  const priorityAthletes = athletes
    .filter((item) => item.supportLevel !== "ready" || !item.checkedInToday)
    .map((item) => item.athlete.name);
  const weekdayFormatter = new Intl.DateTimeFormat(locale, { weekday: "short", month: "short", day: "numeric" });

  return planModes.map((variant, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);

    return {
      isoDate: date.toISOString().slice(0, 10),
      label: weekdayFormatter.format(date),
      variant,
      focus: t(laneKeys[index]),
      loadTarget: getLoadTargetLabel(variant, t),
      coachNote: getCoachNoteLabel(variant, t),
      athleteNames: priorityAthletes.slice(index, index + 3)
    };
  });
}

function getWeekModes(baseVariant: SessionPlanVariant): SessionPlanVariant[] {
  if (baseVariant === "recovery") {
    return ["recovery", "recovery", "controlled", "controlled", "recovery"];
  }

  if (baseVariant === "controlled") {
    return ["controlled", "controlled", "standard", "controlled", "recovery"];
  }

  return ["controlled", "standard", "standard", "standard", "recovery"];
}

function getLoadTargetLabel(variant: SessionPlanVariant, t: ReturnType<typeof useTranslations>) {
  return variant === "recovery"
    ? t("planningLoadRecovery")
    : variant === "controlled"
      ? t("planningLoadControlled")
      : t("planningLoadStandard");
}

function getCoachNoteLabel(variant: SessionPlanVariant, t: ReturnType<typeof useTranslations>) {
  return variant === "recovery"
    ? t("planningCoachRecovery")
    : variant === "controlled"
      ? t("planningCoachControlled")
      : t("planningCoachStandard");
}

function getBlueprintLabel(variant: SessionPlanVariant, t: ReturnType<typeof useTranslations>) {
  return variant === "recovery"
    ? t("sessionBlueprintRecoveryLabel")
    : variant === "controlled"
      ? t("sessionBlueprintControlledLabel")
      : t("sessionBlueprintStandardLabel");
}

function getBlueprintBadgeLabel(variant: SessionPlanVariant, t: ReturnType<typeof useTranslations>) {
  return variant === "recovery"
    ? t("sessionBlueprintRecoveryBadge")
    : variant === "controlled"
      ? t("sessionBlueprintControlledBadge")
      : t("sessionBlueprintStandardBadge");
}

function getBlueprintBadgeColor(variant: SessionPlanVariant) {
  return variant === "recovery" ? "red" : variant === "controlled" ? "yellow" : "green";
}

function getMonday(date: Date) {
  const monday = new Date(date);
  const day = monday.getDay();
  const distance = day === 0 ? -6 : 1 - day;
  monday.setDate(monday.getDate() + distance);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function getInternalLoad(checkIn: CheckInRecord | null) {
  if (!checkIn) return 0;
  const duration = checkIn.trainingLoad?.durationMinutes ?? 0;
  const rpe = checkIn.trainingLoad?.rpe ?? 0;
  if (duration > 0 && rpe > 0) {
    return duration * rpe;
  }
  return checkIn.trainingLoad?.externalLoad ?? 0;
}

function filteredNonEmpty(values: string[]) {
  return values.filter((value) => value.trim().length > 0);
}

function getSupportWeight(level: PlanningAthlete["supportLevel"]) {
  return level === "support" ? 3 : level === "watch" ? 2 : 1;
}
