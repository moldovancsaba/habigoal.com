"use client";

import { useEffect, useState } from "react";
import { Group, SectionPanel, Select } from "@sovereignsquad/gds/client";
import { useTranslations } from "next-intl";
import { LongitudinalChart } from "@/components/analytics/LongitudinalChart";
import { Text } from "@/components/gds/SurfacePrimitives";

// Team readiness trend (GH-526 P1): per-day team-average Daily IQ over the last
// 14 days, from /api/athleteiq/team/trends. Reuses the shared LongitudinalChart.

type TeamRef = { id: string; name: string };
type Point = { date: string; avgDailyIq: number; count: number };

export function TeamTrendsPanel({ teams }: { teams: TeamRef[] }) {
  const t = useTranslations("CoachHub");
  const [teamId, setTeamId] = useState<string>(teams[0]?.id ?? "");
  const [points, setPoints] = useState<Point[] | null>(null);

  useEffect(() => {
    if (!teamId) return;
    let active = true;
    // No synchronous setState here (React Compiler): loading shows from the
    // initial null; results arrive asynchronously in .then.
    fetch(`/api/athleteiq/team/trends?teamId=${encodeURIComponent(teamId)}&days=14`)
      .then((r) => (r.ok ? r.json() : null))
      .then((payload) => {
        if (active) setPoints(Array.isArray(payload?.points) ? payload.points : []);
      })
      .catch(() => {
        if (active) setPoints([]);
      });
    return () => {
      active = false;
    };
  }, [teamId]);

  if (teams.length === 0) return null;

  const data = (points ?? []).map((p) => ({ date: p.date.slice(5), value: p.avgDailyIq }));

  return (
    <SectionPanel title={t("trends.title")} description={t("trends.description")}>
      {teams.length > 1 ? (
        <Group mb="md">
          <Select
            label={t("trends.selectTeam")}
            data={teams.map((team) => ({ value: team.id, label: team.name }))}
            value={teamId}
            onChange={(value) => setTeamId(value ?? teams[0].id)}
            allowDeselect={false}
          />
        </Group>
      ) : null}
      {points === null ? (
        <Text size="sm" c="dimmed">{t("trends.loading")}</Text>
      ) : (
        <LongitudinalChart data={data} yDomain={[0, 100]} emptyLabel={t("trends.empty")} />
      )}
    </SectionPanel>
  );
}
