"use client";

import { useEffect, useMemo, useState } from "react";
import { Box, Loader, Paper, SimpleGrid, Stack, Text, useMantineTheme } from "@mantine/core";
import { useTranslations } from "next-intl";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionCard } from "@/components/ui/SectionCard";
import { LongitudinalChart } from "@/components/analytics/LongitudinalChart";
import { BenchmarkChart } from "@/components/analytics/BenchmarkChart";
import { athleteIqPillars, readinessChecklist, getReadinessMode } from "@/lib/athlete-iq-survey";
import { getCompatiblePillarScore, getCompatibleReadinessState } from "@/lib/assessment-compat";
import type { AssessmentRecord } from "@/types/assessment";
import type { User } from "@/services/user-service";
import { formatScore } from "@/lib/utils";

type DashboardData = {
  users: User[];
  assessments: AssessmentRecord[];
  childrenCount: number;
};

type PillarAveragePoint = {
  subject: string;
  individual: number;
  average: number;
};

type TrendPoint = {
  date: string;
  value: number;
};

const PILLAR_COLORS: Record<string, string> = {
  physical_pillar: "var(--mantine-color-tactical-6)",
  mental_pillar: "var(--mantine-color-synthesis-6)",
  sport_brain_pillar: "var(--mantine-color-strategy-6)"
};

function dayLabel(date: Date) {
  return new Intl.DateTimeFormat(undefined, { month: "2-digit", day: "2-digit" }).format(date);
}

export function MainDashboard() {
  const t = useTranslations("Dashboard");
  const tc = useTranslations("Common");
  const ta = useTranslations("Assessment");
  const theme = useMantineTheme();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void Promise.all([
      fetch("/api/users").then((r) => r.json() as Promise<{ users: User[] }>),
      fetch("/api/assessments").then((r) => r.json() as Promise<{ assessments: AssessmentRecord[] }>),
      fetch("/api/children").then((r) => r.json() as Promise<Array<{ _id?: string }>>)
    ])
      .then(([usersData, assessmentsData, childrenData]) => {
        setData({
          users: usersData.users ?? [],
          assessments: assessmentsData.assessments ?? [],
          childrenCount: Array.isArray(childrenData) ? childrenData.length : 0
        });
      })
      .catch(() => setData({ users: [], assessments: [], childrenCount: 0 }))
      .finally(() => setLoading(false));
  }, []);

  const latestByAthlete = useMemo(() => {
    const latest = new Map<string, AssessmentRecord>();
    for (const assessment of data?.assessments ?? []) {
      const athleteKey = assessment.childId || `${assessment.child.name}|${assessment.child.birthDate}`;
      const current = latest.get(athleteKey);
      if (!current || new Date(assessment.createdAt).getTime() > new Date(current.createdAt).getTime()) {
        latest.set(athleteKey, assessment);
      }
    }
    return Array.from(latest.values());
  }, [data]);

  const earliestByAthlete = useMemo(() => {
    const first = new Map<string, AssessmentRecord>();
    for (const assessment of data?.assessments ?? []) {
      const athleteKey = assessment.childId || `${assessment.child.name}|${assessment.child.birthDate}`;
      const current = first.get(athleteKey);
      if (!current || new Date(assessment.createdAt).getTime() < new Date(current.createdAt).getTime()) {
        first.set(athleteKey, assessment);
      }
    }
    return Array.from(first.values());
  }, [data]);

  const totalSessions = data?.assessments.length ?? 0;
  const totalAthletes = data?.childrenCount ?? 0;
  const avgSessionsPerAthlete = totalAthletes ? (totalSessions / totalAthletes).toFixed(1) : "0.0";
  const activeStaff = data?.users.filter((user) => user.roles.includes("conductor") || user.roles.includes("observer")).length ?? 0;

  const readinessCompliance = useMemo(() => {
    if (latestByAthlete.length === 0) return 0;
    const aggregate = latestByAthlete.reduce(
      (sum, assessment) => {
        const readiness = getCompatibleReadinessState(assessment);
        return {
          count: sum.count + readiness.count,
          total: sum.total + readiness.total
        };
      },
      { count: 0, total: 0 }
    );
    return aggregate.total ? Number(((aggregate.count / aggregate.total) * 100).toFixed(0)) : 0;
  }, [latestByAthlete]);

  const sessionCompletionRate = useMemo(() => {
    const assessments = data?.assessments ?? [];
    if (assessments.length === 0) return 0;
    const done = assessments.reduce((sum, assessment) => sum + assessment.computed.completion.done, 0);
    const total = assessments.reduce((sum, assessment) => sum + assessment.computed.completion.total, 0);
    return total ? Number(((done / total) * 100).toFixed(0)) : 0;
  }, [data]);

  const readinessDistribution = useMemo(() => {
    const counts = { full: 0, moderate: 0, light: 0 };
    latestByAthlete.forEach((assessment) => {
      const readiness = getCompatibleReadinessState(assessment);
      counts[getReadinessMode(readiness.count, readiness.total)] += 1;
    });
    return [
      { name: ta("readinessModeFull"), value: counts.full, color: theme.colors.ingress[6] },
      { name: ta("readinessModeModerate"), value: counts.moderate, color: theme.colors.review[6] },
      { name: ta("readinessModeLight"), value: counts.light, color: theme.colors.gray[5] }
    ].filter((item) => item.value > 0);
  }, [latestByAthlete, ta, theme.colors.gray, theme.colors.ingress, theme.colors.review]);

  const sessionVolume = useMemo(() => buildSessionVolume(data?.assessments ?? []), [data]);

  const pillarBenchmark = useMemo((): PillarAveragePoint[] => {
    return athleteIqPillars.map((pillar) => ({
      subject: ta(pillar.title),
      individual: average(latestByAthlete.map((assessment) => getPillarScore(assessment, pillar.key))) ?? 0,
      average: average(earliestByAthlete.map((assessment) => getPillarScore(assessment, pillar.key))) ?? 0
    }));
  }, [earliestByAthlete, latestByAthlete, ta]);

  const pillarTrendSeries = useMemo(() => buildPillarTrendSeries(data?.assessments ?? []), [data]);

  const locationReadiness = useMemo(() => {
    const map = new Map();
    (data?.assessments ?? []).forEach((assessment) => {
      const location = assessment.session.location || tc("unknown");
      if (!map.has(location)) {
        map.set(location, { readiness: 0, sessions: 0 });
      }
      const entry = map.get(location);
      entry.readiness += getCompatibleReadinessState(assessment).count;
      entry.sessions += 1;
    });
    return Array.from(map.entries())
      .map(([name, entry]) => ({
        name,
        readiness: Number((entry.readiness / entry.sessions).toFixed(1)),
        sessions: entry.sessions
      }))
      .sort((a, b) => b.readiness - a.readiness);
  }, [data, tc]);

  const organizationalPressure = useMemo(() => {
    return [...pillarBenchmark]
      .sort((a, b) => a.individual - b.individual)
      .slice(0, 3);
  }, [pillarBenchmark]);

  if (loading) {
    return (
      <Box style={{ display: "flex", justifyContent: "center", paddingBlock: "2rem" }} role="status">
        <Loader aria-label={tc("loading")} />
      </Box>
    );
  }

  return (
    <Stack gap="lg">
      <PageHeader title={t("overview")} subtitle={t("performanceOverviewSubtitle")} />

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 5 }} spacing="md">
        <MetricCard label={t("totalChildren")} value={String(totalAthletes)} />
        <MetricCard label={t("totalRecords")} value={String(totalSessions)} />
        <MetricCard label={t("avgRecordsPerChild")} value={avgSessionsPerAthlete} />
        <MetricCard label={t("readinessAdherenceLabel")} value={`${readinessCompliance}%`} />
        <MetricCard label={t("completionRateLabel")} value={`${sessionCompletionRate}%`} />
      </SimpleGrid>
      <Text size="sm" c="dimmed">
        {t("performanceOverviewInsight", {
          athletes: totalAthletes,
          sessions: totalSessions,
          average: avgSessionsPerAthlete,
          readiness: readinessCompliance,
          completion: sessionCompletionRate
        })}
      </Text>

      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
        <SectionCard title={t("readinessDistributionTitle")} subheader={t("readinessDistributionSubtitle")}>
          <Box style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={readinessDistribution} innerRadius={54} outerRadius={82} paddingAngle={4} dataKey="value">
                  {readinessDistribution.map((entry, index) => (
                    <Cell key={`slice-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </Box>
          <Text size="sm" c="dimmed">
            {t("readinessDistributionInsight", {
              full: readinessDistribution.find((item) => item.name === ta("readinessModeFull"))?.value ?? 0,
              moderate: readinessDistribution.find((item) => item.name === ta("readinessModeModerate"))?.value ?? 0,
              light: readinessDistribution.find((item) => item.name === ta("readinessModeLight"))?.value ?? 0
            })}
          </Text>
        </SectionCard>

        <SectionCard title={t("pillarBenchmarkTitle")} subheader={t("pillarBenchmarkSubtitle")}>
          <BenchmarkChart
            title={t("pillarBenchmarkInnerTitle")}
            data={pillarBenchmark}
            labels={{
              individual: t("currentAssessment"),
              average: t("baselineAssessment")
            }}
          />
          <Text size="sm" c="dimmed">
            {t("pillarBenchmarkInsight", {
              strongest: pillarBenchmark.slice().sort((a, b) => b.individual - a.individual)[0]?.subject ?? tc("emptyValue"),
              focus: organizationalPressure[0]?.subject ?? tc("emptyValue")
            })}
          </Text>
        </SectionCard>
      </SimpleGrid>

      <SectionCard title={t("sessionVolumeTitle")} subheader={t("sessionVolumeSubtitle")}>
        <LongitudinalChart data={sessionVolume} color="var(--mantine-color-ingress-6)" yDomain={[0, Math.max(6, ...sessionVolume.map((item) => item.value), 1)]} />
      </SectionCard>

      <SectionCard title={t("pillarTrendTitle")} subheader={t("pillarTrendSubtitle")}>
        <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
          {athleteIqPillars.map((pillar) => (
            <LongitudinalChart
              key={pillar.key}
              title={ta(pillar.title)}
              data={pillarTrendSeries[pillar.key] ?? []}
              color={PILLAR_COLORS[pillar.key]}
            />
          ))}
        </SimpleGrid>
      </SectionCard>

      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
        <SectionCard title={t("locationReadinessTitle")} subheader={t("locationReadinessSubtitle")}>
          <Box style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={locationReadiness} layout="vertical" margin={{ left: 30, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.colors.gray[3]} />
                <XAxis type="number" domain={[0, readinessChecklist.length]} hide />
                <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 11, fill: "var(--mantine-color-text)" }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Bar dataKey="readiness" fill="var(--mantine-color-knowmore-6)" radius={[0, 4, 4, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </Box>
          <Text size="sm" c="dimmed">
            {t("locationReadinessInsight", {
              location: locationReadiness[0]?.name ?? tc("unknown"),
              readiness: locationReadiness[0]?.readiness ?? 0
            })}
          </Text>
        </SectionCard>

        <SectionCard title={t("pressureBoardTitle")} subheader={t("pressureBoardSubtitle")}>
          <Stack gap="md">
            {organizationalPressure.map((pillar) => (
              <Paper key={pillar.subject} withBorder p="md" radius="md">
                <Text size="sm" fw={700}>{pillar.subject}</Text>
                <Text size="sm" c="dimmed" mt={4}>
                  {t("pressureBoardItem", {
                    current: formatScore(pillar.individual),
                    baseline: formatScore(pillar.average)
                  })}
                </Text>
              </Paper>
            ))}
            <Text size="sm" c="dimmed">
              {t("pressureBoardInsight", {
                staff: activeStaff,
                locations: locationReadiness.length
              })}
            </Text>
          </Stack>
        </SectionCard>
      </SimpleGrid>
    </Stack>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Paper withBorder p="md" radius="md">
      <Text size="sm" c="dimmed">{label}</Text>
      <Text size="xl" fw={800}>{value}</Text>
    </Paper>
  );
}

function getPillarScore(assessment: AssessmentRecord, key: string) {
  return getCompatiblePillarScore(assessment, key as (typeof athleteIqPillars)[number]["key"]);
}

function average(values: number[]) {
  if (!values.length) return null;
  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2));
}

function buildSessionVolume(assessments: AssessmentRecord[]) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const days = Array.from({ length: 30 }, (_, index) => {
    const date = new Date(now);
    date.setDate(now.getDate() - (29 - index));
    return {
      key: date.toISOString().slice(0, 10),
      date: dayLabel(date),
      value: 0
    };
  });
  const byKey = new Map(days.map((day) => [day.key, day]));
  assessments.forEach((assessment) => {
    const key = new Date(assessment.createdAt).toISOString().slice(0, 10);
    const hit = byKey.get(key);
    if (hit) hit.value += 1;
  });
  return days.map(({ date, value }) => ({ date, value }));
}

function buildPillarTrendSeries(assessments: AssessmentRecord[]): Record<string, TrendPoint[]> {
  const buckets = Object.fromEntries(
    athleteIqPillars.map((pillar) => [pillar.key, [] as TrendPoint[]])
  ) as Record<string, TrendPoint[]>;
  const groupedByDate = new Map<string, AssessmentRecord[]>();

  assessments.forEach((assessment) => {
    const key = assessment.session.date;
    if (!groupedByDate.has(key)) groupedByDate.set(key, []);
    const records = groupedByDate.get(key);
    if (records) {
      records.push(assessment);
    }
  });

  Array.from(groupedByDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([date, records]) => {
      athleteIqPillars.forEach((pillar) => {
        buckets[pillar.key].push({
          date,
          value: average(records.map((record) => getPillarScore(record, pillar.key))) ?? 0
        });
      });
    });

  return buckets;
}
