"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge, Box, Button, Group, Loader, Paper, SimpleGrid, Stack, Text } from "@mantine/core";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionCard } from "@/components/ui/SectionCard";
import { athleteIqPillars, getReadinessMode } from "@/lib/athlete-iq-survey";
import { getCompatiblePillarScore, getCompatibleReadinessScore, getCompatibleReadinessState } from "@/lib/assessment-compat";
import type { CheckInRecord } from "@/types/check-in";
import type { AthleteProfile } from "@/types/athlete";
import type { User } from "@/services/user-service";
import { formatScore } from "@/lib/utils";
import { DEFAULT_SURVEY_SETTINGS, type SurveySettings } from "@/services/settings-service";

type DashboardData = {
  users: User[];
  checkIns: CheckInRecord[];
  athletes: AthleteProfile[];
  settings: SurveySettings;
};

type QueueItem = {
  athlete: AthleteProfile;
  latestCheckIn: CheckInRecord | null;
  checkedInToday: boolean;
  supportLevel: "support" | "watch" | "ready";
  readinessScore: number;
  readinessChecks: number;
  readinessTotal: number;
  priorityScore: number;
  reasons: string[];
  supportAreas: string[];
  recommendations: Recommendation[];
};

type ActionBucket = {
  label: string;
  count: number;
  color: string;
};

type LocationSummary = {
  location: string;
  total: number;
  checkedInToday: number;
  ready: number;
  watch: number;
  support: number;
  priorityAthletes: string[];
};

type EscalationItem = {
  athlete: AthleteProfile;
  title: string;
  detail: string;
  severity: "critical" | "warning";
  athleteHref: string;
  checkInHref: string;
};

type Recommendation = {
  key: string;
  title: string;
  detail: string;
  tone: "red" | "yellow" | "blue" | "green";
};

type SessionAdjustment = {
  athlete: AthleteProfile;
  summary: string;
  detail: string;
  tone: Recommendation["tone"];
};

type SessionBlueprintPlan = {
  variant: "standard" | "controlled" | "recovery";
  label: string;
  summary: string;
  steps: string[];
  athleteAdjustments: SessionAdjustment[];
};

const PRIORITY_QUEUE_LIMIT = 6;

export function MainDashboard() {
  const t = useTranslations("Dashboard");
  const tc = useTranslations("Common");
  const ta = useTranslations("Assessment");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void Promise.all([
      fetch("/api/users").then((r) => r.json() as Promise<{ users: User[] }>),
      fetch("/api/check-ins").then((r) => r.json() as Promise<{ assessments: CheckInRecord[] }>),
      fetch("/api/athletes?metrics=true").then((r) => r.json() as Promise<AthleteProfile[]>),
      fetch("/api/settings").then((r) => r.json() as Promise<SurveySettings>)
    ])
      .then(([usersData, checkInsData, athletesData, settingsData]) => {
        setData({
          users: usersData.users ?? [],
          checkIns: checkInsData.assessments ?? [],
          athletes: Array.isArray(athletesData) ? athletesData : [],
          settings: { ...DEFAULT_SURVEY_SETTINGS, ...settingsData, alerting: { ...DEFAULT_SURVEY_SETTINGS.alerting, ...(settingsData?.alerting ?? {}) } }
        });
      })
      .catch(() => setData({ users: [], checkIns: [], athletes: [], settings: DEFAULT_SURVEY_SETTINGS }))
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

  const queueItems = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const watchThreshold = data?.settings.alerting.watchReadinessThreshold ?? DEFAULT_SURVEY_SETTINGS.alerting.watchReadinessThreshold;
    const supportThreshold = data?.settings.alerting.supportReadinessThreshold ?? DEFAULT_SURVEY_SETTINGS.alerting.supportReadinessThreshold;

    return (data?.athletes ?? [])
      .map((athlete): QueueItem => {
        const athleteKey = athlete._id || `${athlete.name}|${athlete.birthDate}`;
        const latestCheckIn = latestCheckInByAthlete.get(athleteKey) ?? null;
        const checkedInToday = latestCheckIn?.session.date === today;
        const readinessState = latestCheckIn ? getCompatibleReadinessState(latestCheckIn) : { count: 0, total: 9, gaugeValue: 0 };
        const readinessScore = latestCheckIn ? getCompatibleReadinessScore(latestCheckIn) : 0;
        const readinessMode = latestCheckIn ? getReadinessMode(readinessState.count, readinessState.total) : "light";

        const supportLevel =
          readinessScore < supportThreshold ? "support" :
          readinessScore < watchThreshold || readinessMode === "moderate" ? "watch" :
          "ready";
        const supportAreas = latestCheckIn ? athleteIqPillars
          .map((pillar) => ({ title: ta(pillar.title), score: getCompatiblePillarScore(latestCheckIn, pillar.key) }))
          .filter((pillar) => pillar.score < watchThreshold)
          .sort((a, b) => a.score - b.score)
          .map((pillar) => pillar.title) : [];

        const reasons: string[] = [];
        let priorityScore = 0;

        if (!latestCheckIn) {
          reasons.push(t("priorityReasonNoCheckIn"));
          priorityScore += 8;
        } else if (!checkedInToday) {
          reasons.push(t("priorityReasonMissedToday"));
          priorityScore += 6;
        }

        if (supportLevel === "support") {
          reasons.push(t("priorityReasonSupportMode"));
          priorityScore += 5;
        } else if (supportLevel === "watch") {
          reasons.push(t("priorityReasonWatchMode"));
          priorityScore += 2;
        }

        if (latestCheckIn && latestCheckIn.computed.completion.done < latestCheckIn.computed.completion.total) {
          reasons.push(t("priorityReasonLowCompletion"));
          priorityScore += 1;
        }

        if (supportAreas.length > 0) {
          reasons.push(`${t("priorityReasonSupportArea")}: ${supportAreas.slice(0, 2).join(", ")}`);
          priorityScore += Math.min(3, supportAreas.length);
        }

        const recommendations = buildRecommendations({
          checkedInToday,
          latestCheckIn,
          priorityScore,
          readinessChecks: readinessState.count,
          readinessScore,
          readinessTotal: readinessState.total,
          supportAreas,
          supportLevel,
          t,
          tc
        });

        return {
          athlete,
          latestCheckIn,
          checkedInToday,
          supportLevel,
          readinessScore,
          readinessChecks: readinessState.count,
          readinessTotal: readinessState.total,
          priorityScore,
          reasons,
          supportAreas,
          recommendations
        };
      })
      .sort((a, b) => {
        if (b.priorityScore !== a.priorityScore) return b.priorityScore - a.priorityScore;
        if (a.checkedInToday !== b.checkedInToday) return Number(a.checkedInToday) - Number(b.checkedInToday);
        return a.athlete.name.localeCompare(b.athlete.name);
      });
  }, [data, latestCheckInByAthlete, t, ta, tc]);

  const priorityAthletes = queueItems.filter((item) => item.priorityScore > 0).slice(0, PRIORITY_QUEUE_LIMIT);
  const missedCheckIns = queueItems.filter((item) => !item.checkedInToday);
  const supportFlags = queueItems.filter((item) => item.supportLevel !== "ready").slice(0, PRIORITY_QUEUE_LIMIT);

  const checkedInTodayCount = queueItems.filter((item) => item.checkedInToday).length;
  const supportNowCount = queueItems.filter((item) => item.supportLevel === "support").length;
  const watchNowCount = queueItems.filter((item) => item.supportLevel === "watch").length;
  const activeStaff = data?.users.filter((user) => user.roles.includes("conductor") || user.roles.includes("observer")).length ?? 0;

  const actionBuckets: ActionBucket[] = [
    { label: t("actionBucketReady"), count: queueItems.filter((item) => item.supportLevel === "ready").length, color: "var(--mantine-color-ingress-6)" },
    { label: t("actionBucketWatch"), count: watchNowCount, color: "var(--mantine-color-review-6)" },
    { label: t("actionBucketSupport"), count: supportNowCount, color: "var(--mantine-color-red-6)" }
  ];

  const bucketQueues = useMemo(
    () => ({
      ready: queueItems.filter((item) => item.supportLevel === "ready").slice(0, 4),
      watch: queueItems.filter((item) => item.supportLevel === "watch").slice(0, 4),
      support: queueItems.filter((item) => item.supportLevel === "support").slice(0, 4)
    }),
    [queueItems]
  );

  const locationSummaries = useMemo(() => {
    const byLocation = new Map<string, LocationSummary>();

    for (const item of queueItems) {
      const location = item.athlete.latestLocation || item.latestCheckIn?.session.location || tc("unknown");
      if (!byLocation.has(location)) {
        byLocation.set(location, {
          location,
          total: 0,
          checkedInToday: 0,
          ready: 0,
          watch: 0,
          support: 0,
          priorityAthletes: []
        });
      }

      const entry = byLocation.get(location);
      if (!entry) continue;

      entry.total += 1;
      if (item.checkedInToday) entry.checkedInToday += 1;
      entry[item.supportLevel] += 1;
      if (item.priorityScore > 0 && entry.priorityAthletes.length < 3) {
        entry.priorityAthletes.push(item.athlete.name);
      }
    }

    return Array.from(byLocation.values()).sort((a, b) => {
      if (b.support !== a.support) return b.support - a.support;
      if (b.watch !== a.watch) return b.watch - a.watch;
      return a.location.localeCompare(b.location);
    });
  }, [queueItems, tc]);

  const escalationDigest = useMemo(() => {
    const cutoffHour = data?.settings.alerting.missedCheckInCutoffHour ?? DEFAULT_SURVEY_SETTINGS.alerting.missedCheckInCutoffHour;
    const nowHour = new Date().getHours();
    const digestEnabled = data?.settings.alerting.dailyDigestEnabled ?? true;
    if (!digestEnabled) {
      return [] as EscalationItem[];
    }

    const items: EscalationItem[] = [];

    for (const item of queueItems) {
      const athleteHref = item.athlete._id ? `/dashboard/athletes/${item.athlete._id}` : "/dashboard/athletes";
      const checkInHref = item.athlete._id ? `/dashboard/assessment?childId=${item.athlete._id}` : "/dashboard/assessment";

      if (!item.checkedInToday && nowHour >= cutoffHour) {
        items.push({
          athlete: item.athlete,
          title: t("escalationMissedCheckInTitle"),
          detail: t("escalationMissedCheckInBody", { hour: cutoffHour }),
          severity: "critical",
          athleteHref,
          checkInHref
        });
      }

      if (item.supportLevel === "support") {
        items.push({
          athlete: item.athlete,
          title: t("escalationSupportModeTitle"),
          detail: t("escalationSupportModeBody", {
            score: formatScore(item.readinessScore),
            areas: item.supportAreas.slice(0, 2).join(", ") || tc("emptyValue")
          }),
          severity: "critical",
          athleteHref,
          checkInHref
        });
      } else if (item.supportLevel === "watch") {
        items.push({
          athlete: item.athlete,
          title: t("escalationWatchModeTitle"),
          detail: t("escalationWatchModeBody", {
            score: formatScore(item.readinessScore)
          }),
          severity: "warning",
          athleteHref,
          checkInHref
        });
      }
    }

    return items.slice(0, 8);
  }, [data, queueItems, t, tc]);

  const coachRecommendations = useMemo(
    () => queueItems
      .filter((item) => item.recommendations.length > 0 && item.priorityScore > 0)
      .slice(0, PRIORITY_QUEUE_LIMIT),
    [queueItems]
  );

  const sessionBlueprint = useMemo(
    () => buildSessionBlueprint(queueItems, t),
    [queueItems, t]
  );

  if (loading) {
    return (
      <Box style={{ display: "flex", justifyContent: "center", paddingBlock: "2rem" }} role="status">
        <Loader aria-label={tc("loading")} />
      </Box>
    );
  }

  return (
    <Stack gap="lg">
      <PageHeader title={t("commandCenterTitle")} subtitle={t("commandCenterSubtitle")} />

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
        <MetricCard label={t("totalChildren")} value={String(data?.athletes.length ?? 0)} />
        <MetricCard label={t("todayCheckInsLabel")} value={String(checkedInTodayCount)} />
        <MetricCard label={t("missedCheckInsLabel")} value={String(missedCheckIns.length)} tone="red" />
        <MetricCard label={t("supportFlagsLabel")} value={String(supportNowCount + watchNowCount)} tone="yellow" />
      </SimpleGrid>

      <SectionCard title={t("alertDigestTitle")} subheader={t("alertDigestSubtitle")}>
        {escalationDigest.length === 0 ? (
          <Text size="sm" c="dimmed">{t("alertDigestEmpty")}</Text>
        ) : (
          <Stack gap="sm">
            {escalationDigest.map((alert) => (
              <Paper key={`${alert.athlete._id || alert.athlete.name}-${alert.title}`} withBorder p="md" radius="md">
                <Stack gap="sm">
                  <Group justify="space-between" align="flex-start">
                    <Box>
                      <Text fw={700}>{alert.athlete.name}</Text>
                      <Text size="sm" c="dimmed">{alert.title}</Text>
                    </Box>
                    <Badge color={alert.severity === "critical" ? "red" : "yellow"}>
                      {alert.severity === "critical" ? t("alertSeverityCritical") : t("alertSeverityWarning")}
                    </Badge>
                  </Group>
                  <Text size="sm">{alert.detail}</Text>
                  <Group gap="sm">
                    <Button component={Link} href={alert.athleteHref} variant="default" size="sm">
                      {t("openAthleteAction")}
                    </Button>
                    <Button component={Link} href={alert.checkInHref} color="ingress" size="sm">
                      {t("startCheckInAction")}
                    </Button>
                  </Group>
                </Stack>
              </Paper>
            ))}
          </Stack>
        )}
      </SectionCard>

      <SectionCard title={t("nextBestActionsTitle")} subheader={t("nextBestActionsSubtitle")}>
        {coachRecommendations.length === 0 ? (
          <Text size="sm" c="dimmed">{t("nextBestActionsEmpty")}</Text>
        ) : (
          <SimpleGrid cols={{ base: 1, xl: 2 }} spacing="md">
            {coachRecommendations.map((item) => {
              const athleteHref = item.athlete._id ? `/dashboard/athletes/${item.athlete._id}` : "/dashboard/athletes";
              const checkInHref = item.athlete._id ? `/dashboard/assessment?childId=${item.athlete._id}` : "/dashboard/assessment";
              const primaryRecommendation = item.recommendations[0];

              return (
                <Paper key={`recommendation-${item.athlete._id || item.athlete.name}`} withBorder p="md" radius="md">
                  <Stack gap="sm">
                    <Group justify="space-between" align="flex-start">
                      <Box>
                        <Text fw={700}>{item.athlete.name}</Text>
                        <Text size="sm" c="dimmed">{primaryRecommendation.title}</Text>
                      </Box>
                      <Badge color={getRecommendationBadgeColor(primaryRecommendation.tone)}>
                        {getRecommendationBadgeLabel(primaryRecommendation.tone, t)}
                      </Badge>
                    </Group>

                    <Text size="sm">{primaryRecommendation.detail}</Text>

                    {item.recommendations.length > 1 ? (
                      <Stack gap={4}>
                        {item.recommendations.slice(1, 3).map((recommendation) => (
                          <Text key={recommendation.key} size="sm" c="dimmed">
                            {recommendation.title}
                          </Text>
                        ))}
                      </Stack>
                    ) : null}

                    <Group gap="sm">
                      <Button component={Link} href={athleteHref} variant="default" size="sm">
                        {t("openAthleteAction")}
                      </Button>
                      <Button component={Link} href={checkInHref} color="ingress" size="sm">
                        {t("startCheckInAction")}
                      </Button>
                    </Group>
                  </Stack>
                </Paper>
              );
            })}
          </SimpleGrid>
        )}
      </SectionCard>

      <SectionCard title={t("sessionBlueprintTitle")} subheader={t("sessionBlueprintSubtitle")}>
        <Stack gap="md">
          <Group justify="space-between" align="flex-start">
            <Box>
              <Text fw={700}>{sessionBlueprint.label}</Text>
              <Text size="sm" c="dimmed">{sessionBlueprint.summary}</Text>
            </Box>
            <Badge color={getBlueprintBadgeColor(sessionBlueprint.variant)}>
              {getBlueprintBadgeLabel(sessionBlueprint.variant, t)}
            </Badge>
          </Group>

          <SimpleGrid cols={{ base: 1, xl: 2 }} spacing="md">
            <Paper withBorder p="md" radius="md">
              <Stack gap="sm">
                <Text fw={700}>{t("sessionBlueprintStepsTitle")}</Text>
                {sessionBlueprint.steps.map((step) => (
                  <Text key={step} size="sm">
                    {step}
                  </Text>
                ))}
              </Stack>
            </Paper>

            <Paper withBorder p="md" radius="md">
              <Stack gap="sm">
                <Text fw={700}>{t("sessionBlueprintAdjustmentsTitle")}</Text>
                {sessionBlueprint.athleteAdjustments.length === 0 ? (
                  <Text size="sm" c="dimmed">{t("sessionBlueprintAdjustmentsEmpty")}</Text>
                ) : (
                  sessionBlueprint.athleteAdjustments.map((adjustment) => (
                    <Box key={`adjustment-${adjustment.athlete._id || adjustment.athlete.name}`}>
                      <Group justify="space-between" align="flex-start">
                        <Box style={{ flex: 1, minWidth: 0 }}>
                          <Text fw={600}>{adjustment.athlete.name}</Text>
                          <Text size="sm">{adjustment.summary}</Text>
                          <Text size="sm" c="dimmed">{adjustment.detail}</Text>
                        </Box>
                        <Badge color={getRecommendationBadgeColor(adjustment.tone)}>
                          {getRecommendationBadgeLabel(adjustment.tone, t)}
                        </Badge>
                      </Group>
                    </Box>
                  ))
                )}
              </Stack>
            </Paper>
          </SimpleGrid>
        </Stack>
      </SectionCard>

      <Text size="sm" c="dimmed">
        {t("commandCenterInsight", {
          checkedIn: checkedInTodayCount,
          total: data?.athletes.length ?? 0,
          missed: missedCheckIns.length,
          support: supportNowCount,
          watch: watchNowCount,
          staff: activeStaff
        })}
      </Text>

      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
        <SectionCard title={t("priorityQueueTitle")} subheader={t("priorityQueueSubtitle")}>
          <Stack gap="sm">
            {priorityAthletes.length === 0 ? (
              <Text size="sm" c="dimmed">{t("priorityQueueEmpty")}</Text>
            ) : (
              priorityAthletes.map((item) => (
                <QueueCard
                  key={item.athlete._id || `${item.athlete.name}-${item.athlete.birthDate}`}
                  item={item}
                  t={t}
                  tc={tc}
                />
              ))
            )}
          </Stack>
        </SectionCard>

        <SectionCard title={t("teamActionBucketsTitle")} subheader={t("teamActionBucketsSubtitle")}>
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
            {actionBuckets.map((bucket) => (
              <Paper key={bucket.label} withBorder p="md" radius="md">
                <Text size="sm" c="dimmed">{bucket.label}</Text>
                <Text size="xl" fw={800}>{bucket.count}</Text>
                <Box mt="sm" h={8} style={{ borderRadius: 999, background: bucket.color, opacity: 0.85 }} />
              </Paper>
            ))}
          </SimpleGrid>
          <Text size="sm" c="dimmed" mt="md">
            {t("teamActionBucketsInsight", {
              ready: actionBuckets[0]?.count ?? 0,
              watch: actionBuckets[1]?.count ?? 0,
              support: actionBuckets[2]?.count ?? 0
            })}
          </Text>
        </SectionCard>
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
        <SectionCard title={t("missedQueueTitle")} subheader={t("missedQueueSubtitle")}>
          <Stack gap="sm">
            {missedCheckIns.length === 0 ? (
              <Text size="sm" c="dimmed">{t("missedQueueEmpty")}</Text>
            ) : (
              missedCheckIns.slice(0, PRIORITY_QUEUE_LIMIT).map((item) => (
                <QueueCard
                  key={`missed-${item.athlete._id || `${item.athlete.name}-${item.athlete.birthDate}`}`}
                  item={item}
                  t={t}
                  tc={tc}
                  emphasizeMissing
                />
              ))
            )}
          </Stack>
        </SectionCard>

        <SectionCard title={t("supportFlagsTitle")} subheader={t("supportFlagsSubtitle")}>
          <Stack gap="sm">
            {supportFlags.length === 0 ? (
              <Text size="sm" c="dimmed">{t("supportFlagsEmpty")}</Text>
            ) : (
              supportFlags.map((item) => (
                <QueueCard
                  key={`support-${item.athlete._id || `${item.athlete.name}-${item.athlete.birthDate}`}`}
                  item={item}
                  t={t}
                  tc={tc}
                />
              ))
            )}
          </Stack>
        </SectionCard>
      </SimpleGrid>

      <SectionCard title={t("teamLocationSummaryTitle")} subheader={t("teamLocationSummarySubtitle")}>
        {locationSummaries.length === 0 ? (
          <Text size="sm" c="dimmed">{t("teamLocationSummaryEmpty")}</Text>
        ) : (
          <SimpleGrid cols={{ base: 1, xl: 2 }} spacing="md">
            {locationSummaries.map((summary) => (
              <Paper key={summary.location} withBorder p="md" radius="md">
                <Stack gap="sm">
                  <Group justify="space-between" align="flex-start">
                    <Box>
                      <Text fw={700}>{summary.location}</Text>
                      <Text size="sm" c="dimmed">
                        {t("teamLocationSummaryCounts", {
                          checkedIn: summary.checkedInToday,
                          total: summary.total
                        })}
                      </Text>
                    </Box>
                    <Badge color={summary.support > 0 ? "red" : summary.watch > 0 ? "yellow" : "green"}>
                      {summary.support > 0 ? t("actionBucketSupport") : summary.watch > 0 ? t("actionBucketWatch") : t("actionBucketReady")}
                    </Badge>
                  </Group>

                  <SimpleGrid cols={3} spacing="xs">
                    <MiniBucketStat label={t("actionBucketReady")} value={summary.ready} tone="green" />
                    <MiniBucketStat label={t("actionBucketWatch")} value={summary.watch} tone="yellow" />
                    <MiniBucketStat label={t("actionBucketSupport")} value={summary.support} tone="red" />
                  </SimpleGrid>

                  <Text size="sm" c="dimmed">
                    {summary.priorityAthletes.length > 0
                      ? t("teamLocationPriorityAthletes", { athletes: summary.priorityAthletes.join(", ") })
                      : t("teamLocationPriorityAthletesEmpty")}
                  </Text>
                </Stack>
              </Paper>
            ))}
          </SimpleGrid>
        )}
      </SectionCard>

      <SectionCard title={t("bucketDrilldownTitle")} subheader={t("bucketDrilldownSubtitle")}>
        <SimpleGrid cols={{ base: 1, xl: 3 }} spacing="md">
          <BucketColumn
            title={t("actionBucketReady")}
            items={bucketQueues.ready}
            badgeColor="green"
            emptyText={t("bucketDrilldownEmptyReady")}
            t={t}
            tc={tc}
          />
          <BucketColumn
            title={t("actionBucketWatch")}
            items={bucketQueues.watch}
            badgeColor="yellow"
            emptyText={t("bucketDrilldownEmptyWatch")}
            t={t}
            tc={tc}
          />
          <BucketColumn
            title={t("actionBucketSupport")}
            items={bucketQueues.support}
            badgeColor="red"
            emptyText={t("bucketDrilldownEmptySupport")}
            t={t}
            tc={tc}
          />
        </SimpleGrid>
      </SectionCard>
    </Stack>
  );
}

function MetricCard({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "red" | "yellow" }) {
  const color = tone === "red" ? "var(--mantine-color-red-6)" : tone === "yellow" ? "var(--mantine-color-review-6)" : "var(--mantine-color-ingress-6)";
  return (
    <Paper withBorder p="md" radius="md">
      <Text size="sm" c="dimmed">{label}</Text>
      <Text size="xl" fw={800}>{value}</Text>
      <Box mt="sm" h={6} style={{ borderRadius: 999, background: color, opacity: 0.85 }} />
    </Paper>
  );
}

function MiniBucketStat({ label, value, tone }: { label: string; value: number; tone: "green" | "yellow" | "red" }) {
  return (
    <Paper withBorder p="sm" radius="md">
      <Text size="sm" c="dimmed">{label}</Text>
      <Text fw={700} c={tone === "red" ? "red" : tone === "yellow" ? "yellow.7" : "green.7"}>
        {value}
      </Text>
    </Paper>
  );
}

function BucketColumn({
  title,
  items,
  badgeColor,
  emptyText,
  t,
  tc
}: {
  title: string;
  items: QueueItem[];
  badgeColor: string;
  emptyText: string;
  t: ReturnType<typeof useTranslations>;
  tc: ReturnType<typeof useTranslations>;
}) {
  return (
    <Paper withBorder p="md" radius="md">
      <Stack gap="sm">
        <Group justify="space-between" align="center">
          <Text fw={700}>{title}</Text>
          <Badge color={badgeColor}>{items.length}</Badge>
        </Group>
        {items.length === 0 ? (
          <Text size="sm" c="dimmed">{emptyText}</Text>
        ) : (
          items.map((item) => (
            <Box key={`${title}-${item.athlete._id || item.athlete.name}`}>
              <Text fw={600}>{item.athlete.name}</Text>
              <Text size="sm" c="dimmed">
                {t("bucketDrilldownRow", {
                  score: formatScore(item.readinessScore),
                  checks: item.readinessChecks,
                  total: item.readinessTotal
                })}
              </Text>
              <Text size="sm" c="dimmed">
                {item.athlete.latestLocation || item.latestCheckIn?.session.location || tc("unknown")}
              </Text>
            </Box>
          ))
        )}
      </Stack>
    </Paper>
  );
}

function QueueCard({
  item,
  t,
  tc,
  emphasizeMissing = false
}: {
  item: QueueItem;
  t: ReturnType<typeof useTranslations>;
  tc: ReturnType<typeof useTranslations>;
  emphasizeMissing?: boolean;
}) {
  const athleteHref = item.athlete._id ? `/dashboard/athletes/${item.athlete._id}` : "/dashboard/athletes";
  const checkInHref = item.athlete._id ? `/dashboard/assessment?childId=${item.athlete._id}` : "/dashboard/assessment";

  return (
    <Paper withBorder p="md" radius="md">
      <Stack gap="sm">
        <Group justify="space-between" align="flex-start" wrap="wrap">
          <Box style={{ flex: 1, minWidth: 0 }}>
            <Text fw={700}>{item.athlete.name}</Text>
            <Text size="sm" c="dimmed">
              {t("lastCheckInLabel")}: {item.latestCheckIn?.session.date ?? tc("emptyValue")}
            </Text>
          </Box>
          <Group gap="xs">
            <Badge color={item.supportLevel === "support" ? "red" : item.supportLevel === "watch" ? "yellow" : "green"}>
              {item.supportLevel === "support" ? t("actionBucketSupport") : item.supportLevel === "watch" ? t("actionBucketWatch") : t("actionBucketReady")}
            </Badge>
            <Badge variant="light" color={item.checkedInToday ? "ingress" : emphasizeMissing ? "red" : "gray"}>
              {item.checkedInToday ? t("todayStatusCheckedIn") : t("todayStatusMissing")}
            </Badge>
          </Group>
        </Group>

        <Text size="sm">
          {t("queueReadinessSummary", {
            score: formatScore(item.readinessScore),
            checks: item.readinessChecks,
            total: item.readinessTotal
          })}
        </Text>

        {item.reasons.length > 0 ? (
          <Stack gap={4}>
            {item.reasons.slice(0, 3).map((reason) => (
              <Text key={reason} size="sm" c="dimmed">
                {reason}
              </Text>
            ))}
          </Stack>
        ) : null}

        {item.recommendations.length > 0 ? (
          <Stack gap={4}>
            <Text size="sm" fw={600}>{t("nextBestActionsInlineLabel")}</Text>
            {item.recommendations.slice(0, 2).map((recommendation) => (
              <Text key={recommendation.key} size="sm" c="dimmed">
                {recommendation.title}
              </Text>
            ))}
          </Stack>
        ) : null}

        <Group gap="sm">
          <Button component={Link} href={athleteHref} variant="default" size="sm">
            {t("openAthleteAction")}
          </Button>
          <Button component={Link} href={checkInHref} color="ingress" size="sm">
            {t("startCheckInAction")}
          </Button>
        </Group>
      </Stack>
    </Paper>
  );
}

function buildRecommendations({
  checkedInToday,
  latestCheckIn,
  priorityScore,
  readinessChecks,
  readinessScore,
  readinessTotal,
  supportAreas,
  supportLevel,
  t,
  tc
}: {
  checkedInToday: boolean;
  latestCheckIn: CheckInRecord | null;
  priorityScore: number;
  readinessChecks: number;
  readinessScore: number;
  readinessTotal: number;
  supportAreas: string[];
  supportLevel: QueueItem["supportLevel"];
  t: ReturnType<typeof useTranslations>;
  tc: ReturnType<typeof useTranslations>;
}) {
  const recommendations: Recommendation[] = [];

  if (!latestCheckIn) {
    recommendations.push({
      key: "baseline-check-in",
      title: t("recommendationBaselineTitle"),
      detail: t("recommendationBaselineDetail"),
      tone: "red"
    });
  } else if (!checkedInToday) {
    recommendations.push({
      key: "collect-today-check-in",
      title: t("recommendationCollectTitle"),
      detail: t("recommendationCollectDetail"),
      tone: "red"
    });
  }

  if (latestCheckIn && latestCheckIn.computed.completion.done < latestCheckIn.computed.completion.total) {
    recommendations.push({
      key: "complete-check-in",
      title: t("recommendationCompletionTitle"),
      detail: t("recommendationCompletionDetail", {
        done: latestCheckIn.computed.completion.done,
        total: latestCheckIn.computed.completion.total
      }),
      tone: "yellow"
    });
  }

  if (supportLevel === "support") {
    recommendations.push({
      key: "support-conversation",
      title: t("recommendationSupportConversationTitle"),
      detail: t("recommendationSupportConversationDetail", {
        area: supportAreas[0] || tc("emptyValue")
      }),
      tone: "red"
    });
    recommendations.push({
      key: "modify-session-load",
      title: t("recommendationModifySessionTitle"),
      detail: t("recommendationModifySessionDetail", {
        score: formatScore(readinessScore)
      }),
      tone: "red"
    });
  } else if (supportLevel === "watch") {
    recommendations.push({
      key: "pre-session-check",
      title: t("recommendationMonitorTitle"),
      detail: t("recommendationMonitorDetail", {
        checks: readinessChecks,
        total: readinessTotal
      }),
      tone: "yellow"
    });

    if (supportAreas.length > 0) {
      recommendations.push({
        key: "targeted-cue",
        title: t("recommendationTargetedCueTitle"),
        detail: t("recommendationTargetedCueDetail", {
          area: supportAreas[0]
        }),
        tone: "blue"
      });
    }
  } else if (checkedInToday) {
    recommendations.push({
      key: "keep-plan",
      title: t("recommendationMaintainTitle"),
      detail: t("recommendationMaintainDetail", {
        score: formatScore(readinessScore)
      }),
      tone: "green"
    });
  }

  if (priorityScore >= 8 && checkedInToday) {
    recommendations.push({
      key: "same-day-follow-up",
      title: t("recommendationSameDayFollowUpTitle"),
      detail: t("recommendationSameDayFollowUpDetail"),
      tone: "blue"
    });
  }

  return recommendations.slice(0, 3);
}

function getRecommendationBadgeColor(tone: Recommendation["tone"]) {
  return tone === "red" ? "red" : tone === "yellow" ? "yellow" : tone === "green" ? "green" : "blue";
}

function getRecommendationBadgeLabel(tone: Recommendation["tone"], t: ReturnType<typeof useTranslations>) {
  return tone === "red"
    ? t("recommendationToneUrgent")
    : tone === "yellow"
      ? t("recommendationToneMonitor")
      : tone === "green"
        ? t("recommendationToneOnTrack")
        : t("recommendationTonePlan");
}

function buildSessionBlueprint(queueItems: QueueItem[], t: ReturnType<typeof useTranslations>): SessionBlueprintPlan {
  const supportCount = queueItems.filter((item) => item.supportLevel === "support").length;
  const watchCount = queueItems.filter((item) => item.supportLevel === "watch").length;
  const checkedInTodayCount = queueItems.filter((item) => item.checkedInToday).length;
  const missingCount = queueItems.length - checkedInTodayCount;
  const supportHeavy = supportCount >= Math.max(2, Math.ceil(queueItems.length * 0.25));
  const watchHeavy = supportCount + watchCount >= Math.max(3, Math.ceil(queueItems.length * 0.4));

  const variant: SessionBlueprintPlan["variant"] =
    supportHeavy ? "recovery" :
    watchHeavy || missingCount >= Math.max(2, Math.ceil(queueItems.length * 0.25)) ? "controlled" :
    "standard";

  const label =
    variant === "recovery" ? t("sessionBlueprintRecoveryLabel") :
    variant === "controlled" ? t("sessionBlueprintControlledLabel") :
    t("sessionBlueprintStandardLabel");

  const summary = t(
    variant === "recovery"
      ? "sessionBlueprintRecoverySummary"
      : variant === "controlled"
        ? "sessionBlueprintControlledSummary"
        : "sessionBlueprintStandardSummary",
    {
      support: supportCount,
      watch: watchCount,
      missing: missingCount,
      total: queueItems.length
    }
  );

  const steps =
    variant === "recovery"
      ? [
          t("sessionBlueprintRecoveryStep1"),
          t("sessionBlueprintRecoveryStep2"),
          t("sessionBlueprintRecoveryStep3"),
          t("sessionBlueprintRecoveryStep4")
        ]
      : variant === "controlled"
        ? [
            t("sessionBlueprintControlledStep1"),
            t("sessionBlueprintControlledStep2"),
            t("sessionBlueprintControlledStep3"),
            t("sessionBlueprintControlledStep4")
          ]
        : [
            t("blueprintStandardStep1"),
            t("blueprintStandardStep2"),
            t("blueprintStandardStep3"),
            t("blueprintStandardStep4"),
            t("blueprintStandardStep5")
          ];

  const athleteAdjustments = queueItems
    .filter((item) => item.supportLevel !== "ready" || !item.checkedInToday)
    .slice(0, 5)
    .map((item): SessionAdjustment => {
      const primaryRecommendation = item.recommendations[0];

      return {
        athlete: item.athlete,
        summary:
          item.supportLevel === "support"
            ? t("sessionAdjustmentSupportSummary")
            : item.supportLevel === "watch"
              ? t("sessionAdjustmentWatchSummary")
              : t("sessionAdjustmentMissingSummary"),
        detail: primaryRecommendation?.detail || t("sessionBlueprintAdjustmentsEmpty"),
        tone: primaryRecommendation?.tone || (item.supportLevel === "support" ? "red" : item.supportLevel === "watch" ? "yellow" : "blue")
      };
    });

  return { variant, label, summary, steps, athleteAdjustments };
}

function getBlueprintBadgeColor(variant: SessionBlueprintPlan["variant"]) {
  return variant === "recovery" ? "red" : variant === "controlled" ? "yellow" : "green";
}

function getBlueprintBadgeLabel(variant: SessionBlueprintPlan["variant"], t: ReturnType<typeof useTranslations>) {
  return variant === "recovery"
    ? t("sessionBlueprintRecoveryBadge")
    : variant === "controlled"
      ? t("sessionBlueprintControlledBadge")
      : t("sessionBlueprintStandardBadge");
}
