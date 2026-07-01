"use client";

import { useEffect, useState } from "react";
import { Box, Loader, Stack, Text, SimpleGrid, Group, Badge, Paper } from "@mantine/core";
import { PageHeader, SectionPanel, SemanticButton, StateBlock } from "@doneisbetter/gds/client";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { formatScore } from "@/lib/utils";
import { TeamMessagesPanel } from "@/components/dashboard/TeamMessagesPanel";
import { CoachingAlertsPanel } from "@/components/dashboard/CoachingAlertsPanel";
import { ThresholdsPanel } from "@/components/dashboard/ThresholdsPanel";
import { TeamInvitationsManager } from "@/components/teams/TeamInvitationsManager";
import type { AthleteProfile } from "@/types/athlete";
import type { CoachActionRecord } from "@/types/coach-action";
import type { Team } from "@/types/team";
import type { TeamProjection } from "@/types/athleteiq-stakeholder";

// Readiness is recorded on a 0-5 gauge scale (see readiness-model). Map it to a
// traffic-light tone so the roster reflects real recorded status instead of a
// constant "Ready" badge.
function readinessTone(value: number): string {
  if (value >= 4) return "green";
  if (value >= 2.5) return "yellow";
  return "red";
}

interface ConcernItem {
  athleteId?: string;
  athleteName?: string;
  date?: string;
  questionKey: string;
  score: number;
  threshold?: number;
  severity: "watch" | "support";
}

// Concern question keys (e.g. `energy_level`, `readiness_ski`) are not
// coach-readable on their own. Map known keys to a short localized label and
// humanize anything custom so the triage list always reads in plain language.
function humanizeConcernKey(key: string): string {
  return key.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

type TeamOverview = { teamId: string; teamName: string; projection: TeamProjection | null };

function concernKey(concern: ConcernItem): string {
  return `concern:${concern.questionKey}`;
}

export default function CoachDashboardPage() {
  const tc = useTranslations("Common");
  const t = useTranslations("CoachHub");

  const [athletes, setAthletes] = useState<AthleteProfile[]>([]);
  const [concerns, setConcerns] = useState<ConcernItem[]>([]);
  const [coachActions, setCoachActions] = useState<CoachActionRecord[]>([]);
  const [teamOverviews, setTeamOverviews] = useState<TeamOverview[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [resolving, setResolving] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch("/api/athletes?metrics=true").then((res) => res.json()),
      fetch("/api/concerns").then((res) => res.json()),
      fetch("/api/coach-actions").then((res) => res.json()).catch(() => ({ actions: [] })),
      fetch("/api/teams").then((res) => res.json()).catch(() => ({ teams: [] }))
    ])
      .then(([athleteData, concernData, actionData, teamData]) => {
        if (!active) return;
        setAthletes(Array.isArray(athleteData) ? athleteData : []);
        setConcerns(concernData?.concerns ?? []);
        setCoachActions(Array.isArray(actionData?.actions) ? actionData.actions : []);
        const teams: Team[] = Array.isArray(teamData?.teams) ? teamData.teams : [];
        setTeams(teams);
        return Promise.all(
          teams
            .filter((team) => team._id)
            .map((team) =>
              fetch(`/api/athleteiq/team/overview?teamId=${encodeURIComponent(team._id!)}`)
                .then((res) => (res.ok ? res.json() : null))
                .then((payload) => ({ teamId: team._id!, teamName: team.name, projection: payload?.projection ?? null }))
                .catch(() => ({ teamId: team._id!, teamName: team.name, projection: null }))
            )
        );
      })
      .then((overviews) => {
        if (active && overviews) setTeamOverviews(overviews);
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  function isResolved(concern: ConcernItem): boolean {
    return coachActions.some(
      (action) =>
        action.athleteKey === concern.athleteId &&
        action.recommendationKey === concernKey(concern) &&
        action.status === "resolved"
    );
  }

  async function resolveConcern(concern: ConcernItem) {
    if (!concern.athleteId) return;
    const key = `${concern.athleteId}-${concern.questionKey}`;
    setResolving(key);
    const response = await fetch("/api/coach-actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        athleteKey: concern.athleteId,
        date: concern.date,
        recommendationKey: concernKey(concern),
        status: "resolved",
        severity: concern.severity === "support" ? "critical" : "warning",
        sourceType: "readiness-threshold"
      })
    }).catch(() => null);
    if (response?.ok) {
      const saved = (await response.json().catch(() => null)) as CoachActionRecord | null;
      if (saved) setCoachActions((current) => [...current, saved]);
    }
    setResolving(null);
  }

  if (loading) {
    return (
      <Box style={{ display: "flex", justifyContent: "center", paddingBlock: "2rem" }}>
        <Loader />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p="xl">
        <StateBlock variant="error" title={t("loadError")} description={tc("error")} />
      </Box>
    );
  }

  const readinessValues = athletes
    .map((athlete) => athlete.latestReadiness)
    .filter((value): value is number => typeof value === "number");
  const teamAvgReadiness = readinessValues.length
    ? readinessValues.reduce((sum, value) => sum + value, 0) / readinessValues.length
    : null;
  const openConcerns = concerns.filter((concern) => !isResolved(concern));

  // Team rosters (#2): join the team membership ids with the loaded athlete
  // profiles so each squad card can show who is on it, and surface athletes who
  // are not on any team yet so the coach can assign them.
  const athletesById = new Map(athletes.filter((athlete) => athlete._id).map((athlete) => [String(athlete._id), athlete]));
  const assignedAthleteIds = new Set(teams.flatMap((team) => team.athleteIds ?? []).map(String));
  const unassignedAthletes = athletes.filter((athlete) => athlete._id && !assignedAthleteIds.has(String(athlete._id)));
  const rosterByTeamId = new Map(
    teams
      .filter((team) => team._id)
      .map((team) => [
        String(team._id),
        (team.athleteIds ?? []).map((id) => athletesById.get(String(id))).filter((athlete): athlete is AthleteProfile => Boolean(athlete))
      ])
  );

  return (
    <Stack gap="xl" pb="xl">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      <SectionPanel title={t("teamOverview")}>
        <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
          <StateBlock
            variant="info"
            title={t("activeRoster")}
            description={t("activeRosterDesc", { count: athletes.length })}
          />
          <StateBlock
            variant="success"
            title={t("teamAvgReadiness")}
            description={
              teamAvgReadiness !== null
                ? t("teamAvgReadinessValue", { value: formatScore(teamAvgReadiness), count: readinessValues.length })
                : t("teamAvgReadinessDesc")
            }
          />
          <StateBlock
            variant="error"
            title={t("actionItems")}
            description={t("actionItemsDesc", { count: openConcerns.length })}
            action={
              openConcerns.length > 0 ? (
                <a href="#coach-concern-flags" style={{ textDecoration: "none" }}>
                  <SemanticButton action="dashboard" variant="outline">{t("viewDetails")}</SemanticButton>
                </a>
              ) : undefined
            }
          />
        </SimpleGrid>
      </SectionPanel>

      <TeamInvitationsManager teams={teams} />

      <CoachingAlertsPanel
        teams={teams.filter((team) => team._id).map((team) => ({ id: String(team._id), name: team.name }))}
        athleteNames={Object.fromEntries(
          [...athletesById].map(([id, athlete]) => [id, athlete.name])
        )}
      />

      <ThresholdsPanel teams={teams.filter((team) => team._id).map((team) => ({ id: String(team._id), name: team.name }))} />

      {teamOverviews.length > 0 && (
        <SectionPanel title={t("teamSquads")}>
          <SimpleGrid cols={{ base: 1, md: 2, lg: 3 }} spacing="md">
            {teamOverviews.map((overview) => (
              <Paper key={overview.teamId} withBorder p="md">
                <Stack gap="xs">
                  <Group justify="space-between">
                    <Text fw={700}>{overview.teamName}</Text>
                    {overview.projection ? (
                      <Badge variant="light" color="strategy">{t("teamAthletes", { count: overview.projection.athleteCount })}</Badge>
                    ) : null}
                  </Group>
                  {!overview.projection ? (
                    <Text size="sm" c="dimmed">{t("teamNoData")}</Text>
                  ) : overview.projection.readinessDistribution.suppressed ? (
                    <Text size="sm" c="dimmed">{t("teamSuppressed")}</Text>
                  ) : (
                    <>
                      <Group gap="xs">
                        <Badge color="green" variant="light">{t("distGreen", { count: overview.projection.readinessDistribution.green })}</Badge>
                        <Badge color="yellow" variant="light">{t("distYellow", { count: overview.projection.readinessDistribution.yellow })}</Badge>
                        <Badge color="red" variant="light">{t("distRed", { count: overview.projection.readinessDistribution.red })}</Badge>
                        <Badge color="gray" variant="light">{t("distIncomplete", { count: overview.projection.readinessDistribution.incomplete })}</Badge>
                      </Group>
                      <Text size="sm" c="dimmed">{t("teamFlags", { count: overview.projection.flagsCount })}</Text>
                    </>
                  )}

                  {/* Roster (#2): show who is on the squad with their readiness, and a path to manage it. */}
                  <Box>
                    <Text size="sm" fw={700} tt="uppercase" c="dimmed" mb={4}>{t("teamRoster")}</Text>
                    {(rosterByTeamId.get(overview.teamId) ?? []).length === 0 ? (
                      <Text size="sm" c="dimmed">{t("teamRosterEmpty")}</Text>
                    ) : (
                      <Stack gap={4}>
                        {(rosterByTeamId.get(overview.teamId) ?? []).map((member) => (
                          <Group key={member._id} justify="space-between" gap="xs" wrap="nowrap">
                            <Link href={`/dashboard/athletes/${member._id}`} style={{ textDecoration: "none", minWidth: 0 }}>
                              <Text size="sm" truncate>{member.name}</Text>
                            </Link>
                            {typeof member.latestReadiness === "number" ? (
                              <Badge size="sm" color={readinessTone(member.latestReadiness)} variant="light">
                                {formatScore(member.latestReadiness)}
                              </Badge>
                            ) : (
                              <Badge size="sm" color="gray" variant="light">{t("readinessPending")}</Badge>
                            )}
                          </Group>
                        ))}
                      </Stack>
                    )}
                  </Box>
                  <Link href="/dashboard/settings" style={{ textDecoration: "none" }}>
                    <SemanticButton action="settings" variant="subtle" size="sm">{t("teamManage")}</SemanticButton>
                  </Link>
                </Stack>
              </Paper>
            ))}
          </SimpleGrid>
        </SectionPanel>
      )}

      {unassignedAthletes.length > 0 && (
        <SectionPanel title={t("teamUnassigned")}>
          <Stack gap="sm">
            <Text size="sm" c="dimmed">{t("teamUnassignedDesc", { count: unassignedAthletes.length })}</Text>
            <Group gap="xs">
              {unassignedAthletes.map((athlete) => (
                <Link key={athlete._id} href={`/dashboard/athletes/${athlete._id}`} style={{ textDecoration: "none" }}>
                  <Badge variant="outline" color="gray" style={{ cursor: "pointer" }}>{athlete.name}</Badge>
                </Link>
              ))}
            </Group>
            <Link href="/dashboard/settings" style={{ textDecoration: "none" }}>
              <SemanticButton action="settings" variant="light" color="ingress" size="sm">{t("teamUnassignedManage")}</SemanticButton>
            </Link>
          </Stack>
        </SectionPanel>
      )}

      {teams.length > 0 && (
        <SectionPanel title={t("messages.title")}>
          <TeamMessagesPanel teams={teams} athletes={athletes} />
        </SectionPanel>
      )}

      <SectionPanel title={t("athleteRoster")}>
        <Stack gap="md">
          {athletes.map((athlete) => (
            <Paper withBorder key={athlete._id} p="md">
              <Group justify="space-between">
                <Box>
                  <Group gap="xs" mb={4}>
                    <Text fw={700} size="lg">{athlete.name}</Text>
                    {typeof athlete.latestReadiness === "number" ? (
                      <Badge color={readinessTone(athlete.latestReadiness)} variant="light">
                        {t("readinessValue", { value: formatScore(athlete.latestReadiness) })}
                      </Badge>
                    ) : (
                      <Badge color="gray" variant="light">{t("readinessPending")}</Badge>
                    )}
                  </Group>
                  <Text size="sm" c="dimmed">
                    {athlete.latestLocation ? `@${athlete.latestLocation}` : t("statusActive")}
                  </Text>
                </Box>
                <Group>
                  <Link href={`/dashboard/athletes/${athlete._id}/intelligence`}>
                    <SemanticButton action="dashboard" variant="light" color="ingress">{t("intelligence")}</SemanticButton>
                  </Link>
                  <Link href={`/dashboard/athletes/${athlete._id}/vision`}>
                    <SemanticButton action="dashboard" variant="outline" color="strategy">{t("vision")}</SemanticButton>
                  </Link>
                  <Link href={`/dashboard/athletes/${athlete._id}/profile`}>
                    <SemanticButton action="settings" variant="outline">{t("profile")}</SemanticButton>
                  </Link>
                </Group>
              </Group>
            </Paper>
          ))}
          {athletes.length === 0 && (
            <StateBlock variant="info" title={t("noAthletes")} description={t("noAthletesDesc")} />
          )}
        </Stack>
      </SectionPanel>

      <Box id="coach-concern-flags">
        <SectionPanel title={t("concernFlags")}>
          {openConcerns.length === 0 ? (
            <StateBlock variant="success" title={t("concernAllClear")} description={t("concernAllClearDesc")} />
          ) : (
            <Stack gap="sm">
              {/* Open concerns first so the coach acts on what still needs follow-up. */}
              {[...concerns]
                .sort((a, b) => Number(isResolved(a)) - Number(isResolved(b)))
                .map((concern, index) => {
                  const resolved = isResolved(concern);
                  const key = `${concern.athleteId}-${concern.questionKey}`;
                  const metricLabel = t.has(`concernMetric.${concern.questionKey}`)
                    ? t(`concernMetric.${concern.questionKey}`)
                    : humanizeConcernKey(concern.questionKey);
                  return (
                    <Paper key={`${key}-${index}`} withBorder p="md">
                      <Group justify="space-between" wrap="wrap">
                        <Box>
                          <Text fw={600}>{concern.athleteName ?? concern.athleteId}</Text>
                          <Text size="sm" c="dimmed">
                            {metricLabel} · {t("concernScoreLine", { score: concern.score, threshold: concern.threshold ?? concern.score })}
                          </Text>
                        </Box>
                        <Group gap="sm">
                          <Badge color={resolved ? "gray" : concern.severity === "support" ? "red" : "yellow"} variant="light">
                            {resolved ? t("concernResolved") : concern.severity}
                          </Badge>
                          {concern.athleteId ? (
                            <Link href={`/dashboard/athletes/${concern.athleteId}`} style={{ textDecoration: "none" }}>
                              <SemanticButton action="dashboard" variant="outline">{t("concernViewAthlete")}</SemanticButton>
                            </Link>
                          ) : null}
                          {!resolved ? (
                            <SemanticButton
                              action="save"
                              variant="light"
                              color="ingress"
                              loading={resolving === key}
                              onClick={() => void resolveConcern(concern)}
                            >
                              {t("concernResolve")}
                            </SemanticButton>
                          ) : null}
                        </Group>
                      </Group>
                    </Paper>
                  );
                })}
            </Stack>
          )}
        </SectionPanel>
      </Box>
    </Stack>
  );
}
