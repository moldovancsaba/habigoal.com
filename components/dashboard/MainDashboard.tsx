"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge, Box, createGdsVocabularyPack, GdsIcons, Group, Loader, PageHeader, SectionPanel, SemanticButton, SimpleGrid, Stack } from "@sovereignsquad/gds/client";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { athleteIqPillars, getReadinessMode } from "@/lib/readiness-model";
import { getCompatiblePillarScore, getCompatibleReadinessScore, getCompatibleReadinessState } from "@/lib/assessment-compat";
import type { CheckInRecord } from "@/types/check-in";
import type { AthleteProfile } from "@/types/athlete";
import type { CoachActionRecord, CoachActionStatus } from "@/types/coach-action";
import type { User } from "@/services/user-service";
import { formatScore } from "@/lib/utils";
import { DEFAULT_HABIGOAL_SETTINGS, type HabigoalSettings } from "@/services/settings-service";
import { runRecoverableJsonRequest } from "@/lib/request-recovery";
import { getProductColor } from "@/lib/product-ui-contracts";
import { Paper, Text } from "@/components/gds/SurfacePrimitives";

type DashboardData = {
  users: User[];
  checkIns: CheckInRecord[];
  athletes: AthleteProfile[];
  settings: HabigoalSettings;
  coachActions: CoachActionRecord[];
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
  key: string;
  titles: string[];
  details: string[];
  severity: "critical" | "warning";
  athleteHref: string;
  checkInHref: string;
  sourceType: CoachActionRecord["sourceType"];
  sourceId?: string;
  action?: CoachActionRecord | null;
};

type Recommendation = {
  key: string;
  title: string;
  detail: string;
  tone: "plan" | "risk" | "success" | "warning";
  action?: CoachActionRecord | null;
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

type CoachActivitySummary = {
  acknowledgedCount: number;
  appliedCount: number;
  pendingCount: number;
  latestActions: CoachActionRecord[];
  pendingAthletes: QueueItem[];
};

const PRIORITY_QUEUE_LIMIT = 6;

function dashboardToneColor(tone: Recommendation["tone"]): string {
  if (tone === "risk") return getProductColor("dashboard", "risk");
  if (tone === "warning") return getProductColor("dashboard", "warning");
  if (tone === "success") return getProductColor("dashboard", "success");
  return getProductColor("dashboard", "primaryAction");
}

function dashboardSeverityColor(intent: "primaryAction" | "risk" | "success" | "warning"): string {
  return getProductColor("dashboard", intent);
}

function supportLevelColor(level: QueueItem["supportLevel"]): string {
  if (level === "support") return getProductColor("dashboard", "risk");
  if (level === "watch") return getProductColor("dashboard", "warning");
  return getProductColor("dashboard", "success");
}

export function MainDashboard() {
  const t = useTranslations("Dashboard");
  const tc = useTranslations("Common");
  const ta = useTranslations("Assessment");
  const dashboardActionPack = useMemo(
    () =>
      createGdsVocabularyPack("dashboard", {
        acknowledgeAction: {
          defaultMessage: t("acknowledgeAction"),
          icon: GdsIcons.Check
        },
        markAppliedAction: {
          defaultMessage: t("markAppliedAction"),
          icon: GdsIcons.Submit
        }
      }),
    [t]
  );
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingActionKey, setSavingActionKey] = useState<string | null>(null);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    void Promise.all([
      fetch("/api/users").then((r) => r.json() as Promise<{ users: User[] }>),
      fetch("/api/check-ins").then((r) => r.json() as Promise<{ assessments: CheckInRecord[] }>),
      fetch("/api/athletes?metrics=true").then((r) => r.json() as Promise<AthleteProfile[]>),
      fetch("/api/settings").then((r) => r.json() as Promise<HabigoalSettings>),
      fetch(`/api/coach-actions?date=${today}`).then((r) => r.json() as Promise<{ actions: CoachActionRecord[] }>)
    ])
      .then(([usersData, checkInsData, athletesData, settingsData, coachActionsData]) => {
        setData({
          users: usersData.users ?? [],
          checkIns: checkInsData.assessments ?? [],
          athletes: Array.isArray(athletesData) ? athletesData : [],
          settings: { ...DEFAULT_HABIGOAL_SETTINGS, ...settingsData, alerting: { ...DEFAULT_HABIGOAL_SETTINGS.alerting, ...(settingsData?.alerting ?? {}) } },
          coachActions: coachActionsData.actions ?? []
        });
      })
      .catch(() => setData({ users: [], checkIns: [], athletes: [], settings: DEFAULT_HABIGOAL_SETTINGS, coachActions: [] }))
      .finally(() => setLoading(false));
  }, []);

  const coachActionMap = useMemo(() => {
    const map = new Map<string, CoachActionRecord>();
    for (const action of data?.coachActions ?? []) {
      map.set(`${action.athleteKey}:${action.recommendationKey}`, action);
    }
    return map;
  }, [data]);

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
    const watchThreshold = data?.settings.alerting.watchReadinessThreshold ?? DEFAULT_HABIGOAL_SETTINGS.alerting.watchReadinessThreshold;
    const supportThreshold = data?.settings.alerting.supportReadinessThreshold ?? DEFAULT_HABIGOAL_SETTINGS.alerting.supportReadinessThreshold;

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
          athleteKey,
          checkedInToday,
          latestCheckIn,
          priorityScore,
          readinessChecks: readinessState.count,
          readinessScore,
          readinessTotal: readinessState.total,
          supportAreas,
          supportLevel,
          coachActionMap,
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
  }, [data, latestCheckInByAthlete, t, ta, tc, coachActionMap]);

  const priorityAthletes = queueItems.filter((item) => item.priorityScore > 0).slice(0, PRIORITY_QUEUE_LIMIT);
  const missedCheckIns = queueItems.filter((item) => !item.checkedInToday);
  const supportFlags = queueItems.filter((item) => item.supportLevel !== "ready").slice(0, PRIORITY_QUEUE_LIMIT);

  const checkedInTodayCount = queueItems.filter((item) => item.checkedInToday).length;
  const supportNowCount = queueItems.filter((item) => item.supportLevel === "support").length;
  const watchNowCount = queueItems.filter((item) => item.supportLevel === "watch").length;
  const activeStaff = data?.users.filter((user) => user.roles.includes("trainer") || user.roles.includes("admin")).length ?? 0;

  const actionBuckets: ActionBucket[] = [
    { label: t("actionBucketReady"), count: queueItems.filter((item) => item.supportLevel === "ready").length, color: `var(--mantine-color-${getProductColor("dashboard", "success")}-6)` },
    { label: t("actionBucketWatch"), count: watchNowCount, color: `var(--mantine-color-${getProductColor("dashboard", "warning")}-6)` },
    { label: t("actionBucketSupport"), count: supportNowCount, color: `var(--mantine-color-${getProductColor("dashboard", "risk")}-6)` }
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
    const cutoffHour = data?.settings.alerting.missedCheckInCutoffHour ?? DEFAULT_HABIGOAL_SETTINGS.alerting.missedCheckInCutoffHour;
    const nowHour = new Date().getHours();
    const digestEnabled = data?.settings.alerting.dailyDigestEnabled ?? true;
    if (!digestEnabled) {
      return [] as EscalationItem[];
    }

    const itemsByAthlete = new Map<string, EscalationItem>();

    for (const item of queueItems) {
      const athleteKey = item.athlete._id || `${item.athlete.name}|${item.athlete.birthDate}`;
      const alertKey = item.supportLevel === "support" ? "alert-support-mode" : item.checkedInToday ? "alert-watch-mode" : "alert-missed-check-in";
      const athleteHref = item.athlete._id ? `/dashboard/athletes/${item.athlete._id}` : "/dashboard/athletes";
      const checkInHref = item.athlete._id ? `/dashboard/assessment?childId=${item.athlete._id}` : "/dashboard/assessment";
      const existing = itemsByAthlete.get(athleteKey) ?? {
        athlete: item.athlete,
        key: alertKey,
        titles: [],
        details: [],
        severity: "warning" as const,
        athleteHref,
        checkInHref,
        sourceType: "readiness-threshold" as const,
        sourceId: item.latestCheckIn?._id,
        action: coachActionMap.get(`${athleteKey}:${alertKey}`) ?? null
      };

      if (!item.checkedInToday && nowHour >= cutoffHour) {
        existing.key = "alert-missed-check-in";
        existing.titles.push(t("escalationMissedCheckInTitle"));
        existing.details.push(t("escalationMissedCheckInBody", { hour: cutoffHour }));
        existing.severity = "critical";
        existing.sourceType = "missed-check-in";
      }

      if (item.supportLevel === "support") {
        existing.key = "alert-support-mode";
        existing.titles.push(t("escalationSupportModeTitle"));
        existing.details.push(
          t("escalationSupportModeBody", {
            score: formatScore(item.readinessScore),
            areas: item.supportAreas.slice(0, 2).join(", ") || tc("emptyValue")
          })
        );
        existing.severity = "critical";
        existing.sourceType = "readiness-threshold";
      } else if (item.supportLevel === "watch") {
        existing.key = "alert-watch-mode";
        existing.titles.push(t("escalationWatchModeTitle"));
        existing.details.push(
          t("escalationWatchModeBody", {
            score: formatScore(item.readinessScore)
          })
        );
      }

      if (existing.titles.length > 0 || existing.details.length > 0) {
        existing.titles = Array.from(new Set(existing.titles));
        existing.details = Array.from(new Set(existing.details));
        itemsByAthlete.set(athleteKey, existing);
      }
    }

    return Array.from(itemsByAthlete.values())
      .sort((a, b) => {
        if (a.severity !== b.severity) return a.severity === "critical" ? -1 : 1;
        return a.athlete.name.localeCompare(b.athlete.name);
      })
      .slice(0, 8);
  }, [data, queueItems, t, tc, coachActionMap]);

  useEffect(() => {
    if (escalationDigest.length === 0) return;

    const today = new Date().toISOString().slice(0, 10);
    const missingAlerts = escalationDigest.filter((alert) => !alert.action);
    if (missingAlerts.length === 0) return;

    void Promise.all(
      missingAlerts.map((alert) => {
        const athleteKey = alert.athlete._id || `${alert.athlete.name}|${alert.athlete.birthDate}`;
        return fetch("/api/coach-actions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            athleteKey,
            date: today,
            recommendationKey: alert.key,
            status: "open",
            severity: alert.severity,
            sourceType: alert.sourceType,
            sourceId: alert.sourceId,
            detail: alert.details.join(" ")
          })
        })
          .then((response) => (response.ok ? response.json() as Promise<CoachActionRecord> : null))
          .catch(() => null);
      })
    ).then((actions) => {
      const savedActions = actions.filter((action): action is CoachActionRecord => Boolean(action));
      if (savedActions.length === 0) return;
      setData((current) => {
        if (!current) return current;
        const replacementKeys = new Set(savedActions.map((action) => `${action.athleteKey}:${action.recommendationKey}`));
        return {
          ...current,
          coachActions: [
            ...savedActions,
            ...current.coachActions.filter((action) => !replacementKeys.has(`${action.athleteKey}:${action.recommendationKey}`))
          ]
        };
      });
    });
  }, [escalationDigest]);

  const coachRecommendations = useMemo(
    () => queueItems
      .filter((item) => item.recommendations.length > 0 && item.priorityScore > 0)
      .slice(0, PRIORITY_QUEUE_LIMIT),
    [queueItems]
  );

  const sessionBlueprint = useMemo(
    () => buildSessionBlueprint(queueItems, t, ta),
    [queueItems, t, ta]
  );

  const coachActivity = useMemo((): CoachActivitySummary => {
    const latestActions = [...(data?.coachActions ?? [])]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 6);

    const acknowledgedCount = (data?.coachActions ?? []).filter((action) => action.status === "acknowledged").length;
    const appliedCount = (data?.coachActions ?? []).filter((action) => action.status === "applied").length;

    const pendingAthletes = queueItems
      .filter((item) => item.priorityScore > 0)
      .filter((item) => item.recommendations.length === 0 || item.recommendations.every((recommendation) => !recommendation.action))
      .slice(0, 5);

    return {
      acknowledgedCount,
      appliedCount,
      pendingCount: pendingAthletes.length,
      latestActions,
      pendingAthletes
    };
  }, [data, queueItems]);

  async function saveCoachAction(athleteKey: string, recommendationKey: string, status: CoachActionStatus) {
    const requestKey = `${athleteKey}:${recommendationKey}:${status}`;
    setSavingActionKey(requestKey);

    try {
      const result = await runRecoverableJsonRequest<CoachActionRecord>({
        fallbackError: t("saveError"),
        request: () => fetch("/api/coach-actions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            athleteKey,
            date: new Date().toISOString().slice(0, 10),
            recommendationKey,
            status,
            sourceType: "recommendation"
          })
        })
      });

      if (!result.ok) return;

      const action = result.data;
      setData((current) => {
        if (!current) return current;
        const remaining = current.coachActions.filter((entry) => !(entry.athleteKey === action.athleteKey && entry.recommendationKey === action.recommendationKey));
        return {
          ...current,
          coachActions: [action, ...remaining]
        };
      });
    } finally {
      setSavingActionKey(null);
    }
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
      <PageHeader title={t("commandCenterTitle")} subtitle={t("commandCenterSubtitle")} />

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
        <MetricCard label={t("totalChildren")} value={String(data?.athletes.length ?? 0)} />
        <MetricCard label={t("todayCheckInsLabel")} value={String(checkedInTodayCount)} />
        <MetricCard label={t("missedCheckInsLabel")} value={String(missedCheckIns.length)} tone="risk" />
        <MetricCard label={t("supportFlagsLabel")} value={String(supportNowCount + watchNowCount)} tone="warning" />
      </SimpleGrid>

      <SectionPanel title={t("alertDigestTitle")} description={t("alertDigestSubtitle")}>
        {escalationDigest.length === 0 ? (
          <Text size="sm" c="dimmed">{t("alertDigestEmpty")}</Text>
        ) : (
          <Stack gap="sm">
            {escalationDigest.map((alert) => (
              <Paper key={`${alert.athlete._id || alert.athlete.name}-${alert.titles.join("|")}`} withBorder p="md" radius="md">
                <Stack gap="sm">
                  <Group justify="space-between" align="flex-start">
                    <Box>
                      <Text fw={700}>{alert.athlete.name}</Text>
                      <Text size="sm" c="dimmed">{alert.titles.join(" · ")}</Text>
                    </Box>
                    <Badge color={dashboardSeverityColor(alert.severity === "critical" ? "risk" : "warning")}>
                      {alert.severity === "critical" ? t("alertSeverityCritical") : t("alertSeverityWarning")}
                    </Badge>
                    {alert.action ? (
                      <Badge variant="light" color={getActionStatusColor(alert.action.status)}>
                        {getActionStatusLabel(alert.action.status, t)}
                      </Badge>
                    ) : null}
                  </Group>
                  <Stack gap={4}>
                    {alert.details.map((detail) => (
                      <Text key={detail} size="sm">{detail}</Text>
                    ))}
                  </Stack>
                  <Group gap="sm">
                    <Link href={alert.athleteHref} style={{ textDecoration: "none" }}>
                      <SemanticButton action="profile" variant="default" size="sm" />
                    </Link>
                    <Link href={alert.checkInHref} style={{ textDecoration: "none" }}>
                      <SemanticButton action="start" color={getProductColor("dashboard", "primaryAction")} size="sm" />
                    </Link>
                  </Group>
                </Stack>
              </Paper>
            ))}
          </Stack>
        )}
      </SectionPanel>

      <SectionPanel title={t("nextBestActionsTitle")} description={t("nextBestActionsSubtitle")}>
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

                    {primaryRecommendation.action ? (
                      <Group gap="xs">
                        <Badge variant="light" color={getActionStatusColor(primaryRecommendation.action.status)}>
                          {getActionStatusLabel(primaryRecommendation.action.status, t)}
                        </Badge>
                        <Text size="sm" c="dimmed">
                          {t("recommendationStatusByline", { actor: primaryRecommendation.action.actorName || tc("unknown") })}
                        </Text>
                      </Group>
                    ) : null}

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
                      <SemanticButton
                        action="dashboard:acknowledgeAction"
                        variant="light"
                        size="sm"
                        onClick={() =>
                          saveCoachAction(
                            item.athlete._id || `${item.athlete.name}|${item.athlete.birthDate}`,
                            primaryRecommendation.key,
                            "acknowledged"
                          )
                        }
                        loading={savingActionKey === `${item.athlete._id || `${item.athlete.name}|${item.athlete.birthDate}`}:${primaryRecommendation.key}:acknowledged`}
                        vocabularyPacks={[dashboardActionPack]}
                      />
                      <SemanticButton
                        action="dashboard:markAppliedAction"
                        variant="light"
                        size="sm"
                        color={getProductColor("dashboard", "success")}
                        onClick={() =>
                          saveCoachAction(
                            item.athlete._id || `${item.athlete.name}|${item.athlete.birthDate}`,
                            primaryRecommendation.key,
                            "applied"
                          )
                        }
                        loading={savingActionKey === `${item.athlete._id || `${item.athlete.name}|${item.athlete.birthDate}`}:${primaryRecommendation.key}:applied`}
                        vocabularyPacks={[dashboardActionPack]}
                      />
                      <Link href={athleteHref} style={{ textDecoration: "none" }}>
                        <SemanticButton action="profile" variant="default" size="sm" />
                      </Link>
                      <Link href={checkInHref} style={{ textDecoration: "none" }}>
                        <SemanticButton action="start" color={getProductColor("dashboard", "primaryAction")} size="sm" />
                      </Link>
                    </Group>
                  </Stack>
                </Paper>
              );
            })}
          </SimpleGrid>
        )}
      </SectionPanel>

      <SectionPanel title={t("sessionBlueprintTitle")} description={t("sessionBlueprintSubtitle")}>
        <Stack gap="md">
          <Group justify="flex-end">
          <Link href="/dashboard/planning" style={{ textDecoration: "none" }}>
            <SemanticButton action="launch" variant="light" size="sm" />
          </Link>
          </Group>
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
      </SectionPanel>

      <SectionPanel title={t("coachActivityTitle")} description={t("coachActivitySubtitle")}>
        <Stack gap="md">
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
            <MetricCard label={t("coachActivityAcknowledgedLabel")} value={String(coachActivity.acknowledgedCount)} tone="warning" />
            <MetricCard label={t("coachActivityAppliedLabel")} value={String(coachActivity.appliedCount)} />
            <MetricCard label={t("coachActivityPendingLabel")} value={String(coachActivity.pendingCount)} tone="risk" />
          </SimpleGrid>

          <Text size="sm" c="dimmed">
            {t("coachActivityInsight", {
              acknowledged: coachActivity.acknowledgedCount,
              applied: coachActivity.appliedCount,
              pending: coachActivity.pendingCount
            })}
          </Text>

          <SimpleGrid cols={{ base: 1, xl: 2 }} spacing="md">
            <Paper withBorder p="md" radius="md">
              <Stack gap="sm">
                <Text fw={700}>{t("coachActivityLatestTitle")}</Text>
                {coachActivity.latestActions.length === 0 ? (
                  <Text size="sm" c="dimmed">{t("coachActivityLatestEmpty")}</Text>
                ) : (
                  coachActivity.latestActions.map((action) => (
                    <Box key={`${action.athleteKey}-${action.recommendationKey}-${action.updatedAt}`}>
                      <Group justify="space-between" align="flex-start" wrap="wrap">
                        <Box style={{ flex: 1, minWidth: 0 }}>
                          <Text fw={600}>{resolveAthleteLabel(action.athleteKey, queueItems)}</Text>
                          <Text size="sm">{getRecommendationTitleForAction(action, queueItems, t)}</Text>
                          <Text size="sm" c="dimmed">
                            {t("coachActivityLatestByline", { actor: action.actorName || tc("unknown") })}
                          </Text>
                        </Box>
                        <Badge variant="light" color={getActionStatusColor(action.status)}>
                          {getActionStatusLabel(action.status, t)}
                        </Badge>
                      </Group>
                    </Box>
                  ))
                )}
              </Stack>
            </Paper>

            <Paper withBorder p="md" radius="md">
              <Stack gap="sm">
                <Text fw={700}>{t("coachActivityPendingTitle")}</Text>
                {coachActivity.pendingAthletes.length === 0 ? (
                  <Text size="sm" c="dimmed">{t("coachActivityPendingEmpty")}</Text>
                ) : (
                  coachActivity.pendingAthletes.map((item) => (
                    <Box key={`pending-${item.athlete._id || item.athlete.name}`}>
                      <Group justify="space-between" align="flex-start" wrap="wrap">
                        <Box style={{ flex: 1, minWidth: 0 }}>
                          <Text fw={600}>{item.athlete.name}</Text>
                          <Text size="sm">{item.recommendations[0]?.title || t("coachActivityPendingFallback")}</Text>
                          <Text size="sm" c="dimmed">
                            {item.reasons[0] || t("coachActivityPendingFallback")}
                          </Text>
                        </Box>
                        <Badge color={getProductColor("dashboard", "risk")}>{t("coachActivityPendingBadge")}</Badge>
                      </Group>
                    </Box>
                  ))
                )}
              </Stack>
            </Paper>
          </SimpleGrid>
        </Stack>
      </SectionPanel>

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
        <SectionPanel title={t("priorityQueueTitle")} description={t("priorityQueueSubtitle")}>
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
                  onSaveCoachAction={saveCoachAction}
                  savingActionKey={savingActionKey}
                  dashboardActionPack={dashboardActionPack}
                />
              ))
            )}
          </Stack>
        </SectionPanel>

        <SectionPanel title={t("teamActionBucketsTitle")} description={t("teamActionBucketsSubtitle")}>
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
        </SectionPanel>
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
        <SectionPanel title={t("missedQueueTitle")} description={t("missedQueueSubtitle")}>
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
                  onSaveCoachAction={saveCoachAction}
                  savingActionKey={savingActionKey}
                  dashboardActionPack={dashboardActionPack}
                />
              ))
            )}
          </Stack>
        </SectionPanel>

        <SectionPanel title={t("supportFlagsTitle")} description={t("supportFlagsSubtitle")}>
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
                  onSaveCoachAction={saveCoachAction}
                  savingActionKey={savingActionKey}
                  dashboardActionPack={dashboardActionPack}
                />
              ))
            )}
          </Stack>
        </SectionPanel>
      </SimpleGrid>

      <SectionPanel title={t("teamLocationSummaryTitle")} description={t("teamLocationSummarySubtitle")}>
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
                    <Badge color={supportLevelColor(summary.support > 0 ? "support" : summary.watch > 0 ? "watch" : "ready")}>
                      {summary.support > 0 ? t("actionBucketSupport") : summary.watch > 0 ? t("actionBucketWatch") : t("actionBucketReady")}
                    </Badge>
                  </Group>

                  <SimpleGrid cols={3} spacing="xs">
                    <MiniBucketStat label={t("actionBucketReady")} value={summary.ready} tone="success" />
                    <MiniBucketStat label={t("actionBucketWatch")} value={summary.watch} tone="warning" />
                    <MiniBucketStat label={t("actionBucketSupport")} value={summary.support} tone="risk" />
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
      </SectionPanel>

      <SectionPanel title={t("bucketDrilldownTitle")} description={t("bucketDrilldownSubtitle")}>
        <SimpleGrid cols={{ base: 1, xl: 3 }} spacing="md">
          <BucketColumn
            title={t("actionBucketReady")}
            items={bucketQueues.ready}
            badgeColor={supportLevelColor("ready")}
            emptyText={t("bucketDrilldownEmptyReady")}
            t={t}
            tc={tc}
          />
          <BucketColumn
            title={t("actionBucketWatch")}
            items={bucketQueues.watch}
            badgeColor={supportLevelColor("watch")}
            emptyText={t("bucketDrilldownEmptyWatch")}
            t={t}
            tc={tc}
          />
          <BucketColumn
            title={t("actionBucketSupport")}
            items={bucketQueues.support}
            badgeColor={supportLevelColor("support")}
            emptyText={t("bucketDrilldownEmptySupport")}
            t={t}
            tc={tc}
          />
        </SimpleGrid>
      </SectionPanel>
    </Stack>
  );
}

function MetricCard({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "risk" | "warning" }) {
  const token = tone === "risk" ? getProductColor("dashboard", "risk") : tone === "warning" ? getProductColor("dashboard", "warning") : getProductColor("dashboard", "primaryAction");
  return (
    <Paper withBorder p="md" radius="md">
      <Text size="sm" c="dimmed">{label}</Text>
      <Text size="xl" fw={800} c={`${token}.5`}>{value}</Text>
    </Paper>
  );
}

function MiniBucketStat({ label, value, tone }: { label: string; value: number; tone: "risk" | "success" | "warning" }) {
  const color = `${dashboardToneColor(tone)}.7`;
  return (
    <Paper withBorder p="sm" radius="md">
      <Text size="sm" c="dimmed">{label}</Text>
      <Text fw={700} c={color}>
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
  emphasizeMissing = false,
  onSaveCoachAction,
  savingActionKey,
  dashboardActionPack
}: {
  item: QueueItem;
  t: ReturnType<typeof useTranslations>;
  tc: ReturnType<typeof useTranslations>;
  emphasizeMissing?: boolean;
  onSaveCoachAction: (athleteKey: string, recommendationKey: string, status: CoachActionStatus) => void;
  savingActionKey: string | null;
  dashboardActionPack: ReturnType<typeof createGdsVocabularyPack>;
}) {
  const athleteHref = item.athlete._id ? `/dashboard/athletes/${item.athlete._id}` : "/dashboard/athletes";
  const checkInHref = item.athlete._id ? `/dashboard/assessment?childId=${item.athlete._id}` : "/dashboard/assessment";
  const athleteKey = item.athlete._id || `${item.athlete.name}|${item.athlete.birthDate}`;

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
            <Badge color={supportLevelColor(item.supportLevel)}>
              {item.supportLevel === "support" ? t("actionBucketSupport") : item.supportLevel === "watch" ? t("actionBucketWatch") : t("actionBucketReady")}
            </Badge>
            <Badge variant="light" color={item.checkedInToday ? getProductColor("dashboard", "success") : emphasizeMissing ? getProductColor("dashboard", "risk") : getProductColor("dashboard", "neutral")}>
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
              <Group key={recommendation.key} justify="space-between" align="center" wrap="wrap">
                <Text size="sm" c="dimmed">
                  {recommendation.title}
                </Text>
                {recommendation.action ? (
                  <Badge variant="light" color={getActionStatusColor(recommendation.action.status)}>
                    {getActionStatusLabel(recommendation.action.status, t)}
                  </Badge>
                ) : null}
              </Group>
            ))}
          </Stack>
        ) : null}

        <Group gap="sm">
          {item.recommendations[0] ? (
            <>
          <SemanticButton
            action="dashboard:acknowledgeAction"
            variant="light"
            size="sm"
            onClick={() => onSaveCoachAction(athleteKey, item.recommendations[0].key, "acknowledged")}
            loading={savingActionKey === `${athleteKey}:${item.recommendations[0].key}:acknowledged`}
            vocabularyPacks={[dashboardActionPack]}
          />
          <SemanticButton
            action="dashboard:markAppliedAction"
            variant="light"
            size="sm"
            color={getProductColor("dashboard", "success")}
            onClick={() => onSaveCoachAction(athleteKey, item.recommendations[0].key, "applied")}
            loading={savingActionKey === `${athleteKey}:${item.recommendations[0].key}:applied`}
            vocabularyPacks={[dashboardActionPack]}
          />
            </>
          ) : null}
          <Link href={athleteHref} style={{ textDecoration: "none" }}>
            <SemanticButton action="profile" variant="default" size="sm" />
          </Link>
          <Link href={checkInHref} style={{ textDecoration: "none" }}>
            <SemanticButton action="start" color={getProductColor("dashboard", "primaryAction")} size="sm" />
          </Link>
        </Group>
      </Stack>
    </Paper>
  );
}

function buildRecommendations({
  athleteKey,
  checkedInToday,
  latestCheckIn,
  priorityScore,
  readinessChecks,
  readinessScore,
  readinessTotal,
  supportAreas,
  supportLevel,
  coachActionMap,
  t,
  tc
}: {
  athleteKey: string;
  checkedInToday: boolean;
  latestCheckIn: CheckInRecord | null;
  priorityScore: number;
  readinessChecks: number;
  readinessScore: number;
  readinessTotal: number;
  supportAreas: string[];
  supportLevel: QueueItem["supportLevel"];
  coachActionMap: Map<string, CoachActionRecord>;
  t: ReturnType<typeof useTranslations>;
  tc: ReturnType<typeof useTranslations>;
}) {
  const recommendations: Recommendation[] = [];

  if (!latestCheckIn) {
    recommendations.push({
      key: "baseline-check-in",
      title: t("recommendationBaselineTitle"),
      detail: t("recommendationBaselineDetail"),
      tone: "risk"
    });
  } else if (!checkedInToday) {
    recommendations.push({
      key: "collect-today-check-in",
      title: t("recommendationCollectTitle"),
      detail: t("recommendationCollectDetail"),
      tone: "risk"
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
      tone: "warning"
    });
  }

  if (supportLevel === "support") {
    recommendations.push({
      key: "support-conversation",
      title: t("recommendationSupportConversationTitle"),
      detail: t("recommendationSupportConversationDetail", {
        area: supportAreas[0] || tc("emptyValue")
      }),
      tone: "risk"
    });
    recommendations.push({
      key: "modify-session-load",
      title: t("recommendationModifySessionTitle"),
      detail: t("recommendationModifySessionDetail", {
        score: formatScore(readinessScore)
      }),
      tone: "risk"
    });
  } else if (supportLevel === "watch") {
    recommendations.push({
      key: "pre-session-check",
      title: t("recommendationMonitorTitle"),
      detail: t("recommendationMonitorDetail", {
        checks: readinessChecks,
        total: readinessTotal
      }),
      tone: "warning"
    });

    if (supportAreas.length > 0) {
      recommendations.push({
        key: "targeted-cue",
        title: t("recommendationTargetedCueTitle"),
        detail: t("recommendationTargetedCueDetail", {
          area: supportAreas[0]
        }),
        tone: "plan"
      });
    }
  } else if (checkedInToday) {
    recommendations.push({
      key: "keep-plan",
      title: t("recommendationMaintainTitle"),
      detail: t("recommendationMaintainDetail", {
        score: formatScore(readinessScore)
      }),
      tone: "success"
    });
  }

  if (priorityScore >= 8 && checkedInToday) {
    recommendations.push({
      key: "same-day-follow-up",
      title: t("recommendationSameDayFollowUpTitle"),
      detail: t("recommendationSameDayFollowUpDetail"),
      tone: "plan"
    });
  }

  return recommendations.slice(0, 3).map((recommendation) => ({
    ...recommendation,
    action: coachActionMap.get(`${athleteKey}:${recommendation.key}`) || null
  }));
}

function getRecommendationBadgeColor(tone: Recommendation["tone"]) {
  return dashboardToneColor(tone);
}

function getRecommendationBadgeLabel(tone: Recommendation["tone"], t: ReturnType<typeof useTranslations>) {
  return tone === "risk"
    ? t("recommendationToneUrgent")
    : tone === "warning"
      ? t("recommendationToneMonitor")
      : tone === "success"
        ? t("recommendationToneOnTrack")
        : t("recommendationTonePlan");
}

function getActionStatusColor(status: CoachActionStatus) {
  if (status === "applied" || status === "resolved") return getProductColor("dashboard", "success");
  if (status === "open") return getProductColor("dashboard", "risk");
  return getProductColor("dashboard", "primaryAction");
}

function getActionStatusLabel(status: CoachActionStatus, t: ReturnType<typeof useTranslations>) {
  if (status === "applied") return t("coachActionApplied");
  if (status === "resolved") return t("coachActionResolved");
  if (status === "open") return t("coachActionOpen");
  return t("coachActionAcknowledged");
}

function buildSessionBlueprint(
  queueItems: QueueItem[],
  t: ReturnType<typeof useTranslations>,
  ta: ReturnType<typeof useTranslations>
): SessionBlueprintPlan {
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
            ta("blueprintStandardStep1"),
            ta("blueprintStandardStep2"),
            ta("blueprintStandardStep3"),
            ta("blueprintStandardStep4"),
            ta("blueprintStandardStep5")
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
        tone: primaryRecommendation?.tone || (item.supportLevel === "support" ? "risk" : item.supportLevel === "watch" ? "warning" : "plan")
      };
    });

  return { variant, label, summary, steps, athleteAdjustments };
}

function getBlueprintBadgeColor(variant: SessionBlueprintPlan["variant"]) {
  return variant === "recovery" ? getProductColor("dashboard", "risk") : variant === "controlled" ? getProductColor("dashboard", "warning") : getProductColor("dashboard", "success");
}

function getBlueprintBadgeLabel(variant: SessionBlueprintPlan["variant"], t: ReturnType<typeof useTranslations>) {
  return variant === "recovery"
    ? t("sessionBlueprintRecoveryBadge")
    : variant === "controlled"
      ? t("sessionBlueprintControlledBadge")
      : t("sessionBlueprintStandardBadge");
}

function resolveAthleteLabel(athleteKey: string, queueItems: QueueItem[]) {
  return queueItems.find((item) => (item.athlete._id || `${item.athlete.name}|${item.athlete.birthDate}`) === athleteKey)?.athlete.name || athleteKey;
}

function getRecommendationTitleForAction(
  action: CoachActionRecord,
  queueItems: QueueItem[],
  t: ReturnType<typeof useTranslations>
) {
  const item = queueItems.find((entry) => (entry.athlete._id || `${entry.athlete.name}|${entry.athlete.birthDate}`) === action.athleteKey);
  const recommendation = item?.recommendations.find((entry) => entry.key === action.recommendationKey);
  return recommendation?.title || t("coachActivityPendingFallback");
}
