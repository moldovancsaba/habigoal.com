"use client";

import { useEffect, useState } from "react";
import { Badge, Box, Group, Paper, Stack, Text } from "@mantine/core";
import { SectionPanel } from "@doneisbetter/gds/client";
import { useTranslations } from "next-intl";

// P0 #525: surfaces the coach recommendation + injury-risk queues in the coach
// dashboard. Fetches /coach/recommendations and /coach/injury-alerts per team,
// merges by athlete, and renders a single triage-ordered list. Recommendation
// text is coach-authorized here (this is a coach-only surface).

type TeamRef = { id: string; name: string };

type Readiness = { zone: string; score: number };
type Recommendation = { text: string; reason: string; confidence: string; humanReviewRequired: boolean; delivery: string };
type InjuryRisk = { riskLevel: string; flags: string[]; loadReductionRecommended: boolean; confidence: string };

type Entry = {
  athleteId: string;
  teamName: string;
  readiness?: Readiness;
  recommendation?: Recommendation;
  injuryRisk?: InjuryRisk;
  urgency: number;
};

const RISK_COLOR: Record<string, string> = { high: "red", elevated: "yellow", low: "gray" };

export function CoachingAlertsPanel({ teams, athleteNames }: { teams: TeamRef[]; athleteNames: Record<string, string> }) {
  const t = useTranslations("CoachHub");
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const teamKey = teams.map((team) => team.id).join(",");

  useEffect(() => {
    let active = true;
    // Empty teams flows through Promise.all([]) → resolves to [] and sets state
    // asynchronously in .then (no synchronous setState in effect).
    Promise.all(
      teams.map(async (team) => {
        const [recRes, injRes] = await Promise.all([
          fetch(`/api/athleteiq/coach/recommendations?teamId=${encodeURIComponent(team.id)}`)
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null),
          fetch(`/api/athleteiq/coach/injury-alerts?teamId=${encodeURIComponent(team.id)}`)
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null),
        ]);
        const byId = new Map<string, Entry>();
        for (const r of recRes?.recommendations ?? []) {
          byId.set(r.athleteId, {
            athleteId: r.athleteId,
            teamName: team.name,
            readiness: r.readiness,
            recommendation: r.recommendation,
            urgency: r.urgency,
          });
        }
        for (const a of injRes?.alerts ?? []) {
          const existing: Entry = byId.get(a.athleteId) ?? { athleteId: a.athleteId, teamName: team.name, urgency: a.urgency };
          existing.injuryRisk = a.injuryRisk;
          existing.readiness = existing.readiness ?? a.readiness;
          byId.set(a.athleteId, existing);
        }
        return [...byId.values()];
      })
    )
      .then((lists) => {
        if (!active) return;
        setEntries(lists.flat().sort((x, y) => y.urgency - x.urgency));
      })
      .catch(() => {
        if (active) setEntries([]);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamKey]);

  return (
    <SectionPanel title={t("coachingAlerts.title")} description={t("coachingAlerts.description")}>
      {entries === null ? (
        <Text size="sm" c="dimmed">{t("coachingAlerts.loading")}</Text>
      ) : entries.length === 0 ? (
        <Text size="sm" c="dimmed">{t("coachingAlerts.empty")}</Text>
      ) : (
        <Stack gap="sm">
          {entries.map((entry) => (
            <Paper key={`${entry.teamName}:${entry.athleteId}`} withBorder p="md" radius="md">
              <Stack gap="xs">
                <Group justify="space-between" align="flex-start">
                  <Stack gap={2}>
                    <Text fw={700}>{athleteNames[entry.athleteId] ?? entry.athleteId}</Text>
                    <Text size="sm" c="dimmed">{entry.teamName}</Text>
                  </Stack>
                  <Group gap="xs">
                    {entry.injuryRisk && entry.injuryRisk.riskLevel !== "low" ? (
                      <Badge color={RISK_COLOR[entry.injuryRisk.riskLevel] ?? "gray"} variant="filled">
                        {t("coachingAlerts.injuryRisk", { level: t(`coachingAlerts.risk.${entry.injuryRisk.riskLevel}`) })}
                      </Badge>
                    ) : null}
                    {entry.readiness ? (
                      <Badge variant="light" color="strategy">
                        {t("coachingAlerts.readiness", { zone: t(`coachingAlerts.zone.${entry.readiness.zone}`), score: entry.readiness.score })}
                      </Badge>
                    ) : null}
                  </Group>
                </Group>

                {entry.recommendation ? (
                  <Box>
                    <Text size="sm">{entry.recommendation.text}</Text>
                    <Group gap="xs" mt={4}>
                      <Badge size="sm" variant="outline" color="gray">
                        {t("coachingAlerts.confidence", { level: t(`coachingAlerts.conf.${entry.recommendation.confidence}`) })}
                      </Badge>
                      {entry.recommendation.humanReviewRequired ? (
                        <Badge size="sm" variant="light" color="orange">{t("coachingAlerts.humanReview")}</Badge>
                      ) : null}
                    </Group>
                  </Box>
                ) : null}

                {entry.injuryRisk?.loadReductionRecommended ? (
                  <Text size="sm" c="dimmed">{t("coachingAlerts.loadReduction")}</Text>
                ) : null}
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}
    </SectionPanel>
  );
}
