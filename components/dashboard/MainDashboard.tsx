"use client";

import { useEffect, useMemo, useState } from "react";
import { Box, Loader, Paper, Stack, Text, useMantineTheme } from "@mantine/core";
import { useTranslations } from "next-intl";
import { CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionCard } from "@/components/ui/SectionCard";
import { rapidSections } from "@/lib/kidex-schema";
import { getDomainMainColor, type AssessmentDomain } from "@/lib/domain-colors";
import type { AssessmentRecord } from "@/types/assessment";
import type { User } from "@/services/user-service";

type DashboardData = {
  users: User[];
  assessments: AssessmentRecord[];
  childrenCount: number;
};

const DASHBOARD_CHART_CONFIG = {
  dayWindow: 30,
  chartHeight: 220,
  lineMargin: { top: 10, right: 8, left: -20, bottom: 8 },
  tickFontSize: 12,
  lineStrokeWidth: 2.5,
  dotRadius: 4,
  activeDotRadius: 5,
  tooltipRadius: 8,
  pieCx: "35%" as const,
  pieCy: "50%" as const,
  pieOuterRadius: 72,
  pieInnerRadius: 34,
  radarOuterRadius: 74
} as const;
const CHART_FONT_FAMILY = 'var(--font-noto-sans), "Noto Sans", Helvetica, Arial, sans-serif';

function dayLabel(date: Date) {
  return new Intl.DateTimeFormat(undefined, { month: "2-digit", day: "2-digit" }).format(date);
}

export function MainDashboard() {
  const t = useTranslations("Dashboard");
  const tc = useTranslations("Common");
  const ts = useTranslations("Schema");
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

  const recordsByDay = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const days = Array.from({ length: DASHBOARD_CHART_CONFIG.dayWindow }, (_, idx) => {
      const d = new Date(now);
      d.setDate(now.getDate() - (DASHBOARD_CHART_CONFIG.dayWindow - 1 - idx));
      return { key: d.toISOString().slice(0, 10), label: dayLabel(d), count: 0 };
    });
    const indexByKey = new Map(days.map((d) => [d.key, d]));
    for (const record of data?.assessments ?? []) {
      const createdAt = new Date(record.createdAt);
      const key = new Date(createdAt.getFullYear(), createdAt.getMonth(), createdAt.getDate()).toISOString().slice(0, 10);
      const hit = indexByKey.get(key);
      if (hit) hit.count += 1;
    }
    return days;
  }, [data]);

  const userRoleStats = useMemo(() => {
    const users = data?.users ?? [];
    const conductors = users.filter((u) => u.roles.includes("conductor")).length;
    const observers = users.filter((u) => u.roles.includes("observer")).length;
    return [
      { label: t("conductors"), count: conductors },
      { label: t("observers"), count: observers }
    ];
  }, [data, t]);

  const avgRecordsPerChild = useMemo(() => {
    const children = data?.childrenCount ?? 0;
    const records = data?.assessments.length ?? 0;
    if (children === 0) return "0.0";
    return (records / children).toFixed(1);
  }, [data]);

  const rapidDomainSummary = useMemo(() => buildRapidDomainSummary(data?.assessments ?? [], ts), [data, ts]);

  if (loading) {
    return (
      <Box style={{ display: "flex", justifyContent: "center", paddingBlock: "2rem" }} role="status">
        <Loader aria-label={tc("loading")} />
      </Box>
    );
  }

  return (
    <Stack gap="lg">
      <PageHeader title={t("overview")} subtitle={t("overviewSubtitle")} />

      <Stack gap="md" style={{ flexDirection: "row", flexWrap: "wrap" }}>
        <MetricCard label={t("totalUsers")} value={String(data?.users.length ?? 0)} />
        <MetricCard label={t("totalRecords")} value={String(data?.assessments.length ?? 0)} />
      </Stack>

      <Stack gap="md" style={{ flexDirection: "row", flexWrap: "wrap" }}>
        <MetricCard label={t("totalChildren")} value={String(data?.childrenCount ?? 0)} />
        <MetricCard label={t("avgRecordsPerChild")} value={avgRecordsPerChild} />
      </Stack>

      <SectionCard title={t("rapidSpiderSummaryTitle")} subheader={t("rapidSpiderSummarySubtitle")}>
        <Stack gap="md" style={{ flexDirection: "row", flexWrap: "wrap" }}>
          <Box style={{ flex: 1, minWidth: 0 }}>
            <RapidRadarChart title={t("rapidMovementTitle")} data={rapidDomainSummary.movement} domain="movement" />
          </Box>
          <Box style={{ flex: 1, minWidth: 0 }}>
            <RapidRadarChart title={t("rapidSocialTitle")} data={rapidDomainSummary.social} domain="social" />
          </Box>
          <Box style={{ flex: 1, minWidth: 0 }}>
            <RapidRadarChart title={t("rapidMentalTitle")} data={rapidDomainSummary.mental} domain="mental" />
          </Box>
        </Stack>
      </SectionCard>

      <Stack gap="md" style={{ flexDirection: "row", flexWrap: "wrap" }}>
        <Box style={{ flex: 1, minWidth: 0, display: "flex" }}>
          <SectionCard title={t("recordsChartTitle")} subheader={t("recordsChartSubtitle")} sx={{ width: "100%", height: "100%", mb: 0 }}>
            <RecordsLineChart points={recordsByDay} />
          </SectionCard>
        </Box>

        <Box style={{ flex: 1, minWidth: 0, display: "flex" }}>
          <SectionCard title={t("usersChartTitle")} subheader={t("usersChartSubtitle")} sx={{ width: "100%", height: "100%", mb: 0 }}>
            <UserRolePieChart items={userRoleStats} />
          </SectionCard>
        </Box>
      </Stack>

    </Stack>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Paper withBorder p="md" style={{ flex: "1 1 220px" }}>
      <Text size="sm" c="dimmed">
        {label}
      </Text>
      <Text size="xl" fw={800}>
        {value}
      </Text>
    </Paper>
  );
}

function RecordsLineChart({
  points
}: {
  points: Array<{ key: string; label: string; count: number }>;
}) {
  const theme = useMantineTheme();
  const t = useTranslations("Dashboard");

  const values = points.map((p) => p.count);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const yMin = min === max ? Math.max(0, min - 1) : min;
  const yMax = min === max ? max + 1 : max;

  return (
    <Stack gap={6}>
      <Box style={{ width: "100%", height: DASHBOARD_CHART_CONFIG.chartHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={DASHBOARD_CHART_CONFIG.lineMargin}>
            <CartesianGrid stroke={theme.colors.gray[4]} strokeDasharray="3 3" />
            <XAxis
              dataKey="label"
              stroke={theme.colors.gray[5]}
              tick={{ fontSize: DASHBOARD_CHART_CONFIG.tickFontSize, fill: "var(--mantine-color-text)", fontFamily: CHART_FONT_FAMILY }}
            />
            <YAxis
              domain={[yMin, yMax]}
              allowDecimals={false}
              stroke={theme.colors.gray[5]}
              tick={{ fontSize: DASHBOARD_CHART_CONFIG.tickFontSize, fill: "var(--mantine-color-text)", fontFamily: CHART_FONT_FAMILY }}
              width={28}
            />
            <Tooltip
              contentStyle={{
                background: theme.colors.dark[7],
                border: `1px solid ${theme.colors.dark[4]}`,
                borderRadius: DASHBOARD_CHART_CONFIG.tooltipRadius
              }}
            />
            <Line
              type="monotone"
              dataKey="count"
              stroke={theme.colors.kidex[6]}
              strokeWidth={DASHBOARD_CHART_CONFIG.lineStrokeWidth}
              dot={{ r: DASHBOARD_CHART_CONFIG.dotRadius, fill: theme.colors.kidex[6] }}
              activeDot={{ r: DASHBOARD_CHART_CONFIG.activeDotRadius }}
            />
          </LineChart>
        </ResponsiveContainer>
      </Box>
      <Text size="sm" c="dimmed">
        {t("recordsChartYRange", { min: yMin, max: yMax })}
      </Text>
    </Stack>
  );
}

function UserRolePieChart({
  items
}: {
  items: Array<{ label: string; count: number }>;
}) {
  const theme = useMantineTheme();
  const chartData = items.map((item) => ({ name: item.label, value: item.count }));
  const colors = [theme.colors.kidex[6], theme.black];

  return (
    <Box style={{ width: "100%", height: DASHBOARD_CHART_CONFIG.chartHeight }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip
            contentStyle={{
              background: theme.colors.dark[7],
              border: `1px solid ${theme.colors.dark[4]}`,
              borderRadius: DASHBOARD_CHART_CONFIG.tooltipRadius
            }}
          />
          <Legend verticalAlign="middle" align="right" layout="vertical" wrapperStyle={{ fontFamily: CHART_FONT_FAMILY, color: "var(--mantine-color-text)" }} />
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            cx={DASHBOARD_CHART_CONFIG.pieCx}
            cy={DASHBOARD_CHART_CONFIG.pieCy}
            outerRadius={DASHBOARD_CHART_CONFIG.pieOuterRadius}
            innerRadius={DASHBOARD_CHART_CONFIG.pieInnerRadius}
          >
            {chartData.map((entry, index) => (
              <Cell key={`slice-${entry.name}`} fill={colors[index % colors.length]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </Box>
  );
}

function RapidRadarChart({
  title,
  data,
  domain
}: {
  title: string;
  data: Array<{ label: string; value: number }>;
  domain: AssessmentDomain;
}) {
  const theme = useMantineTheme();
  const domainColor = getDomainMainColor(domain);

  return (
    <Paper withBorder p="sm">
      <Text fw={600} mb={6}>
        {title}
      </Text>
      <Box style={{ width: "100%", height: DASHBOARD_CHART_CONFIG.chartHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data}>
            <PolarGrid stroke={theme.colors.gray[4]} />
            <PolarAngleAxis
              dataKey="label"
              tick={{ fontSize: DASHBOARD_CHART_CONFIG.tickFontSize, fill: "var(--mantine-color-text)", fontFamily: CHART_FONT_FAMILY }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 6]}
              tickCount={4}
              tick={(props) => renderRotatedRadiusTick(props)}
              stroke={theme.colors.gray[6]}
            />
            <Tooltip
              contentStyle={{
                background: theme.colors.dark[7],
                border: `1px solid ${theme.colors.dark[4]}`,
                borderRadius: DASHBOARD_CHART_CONFIG.tooltipRadius
              }}
            />
            <Radar
              dataKey="value"
              stroke={domainColor}
              fill={domainColor}
              fillOpacity={0.28}
            />
          </RadarChart>
        </ResponsiveContainer>
      </Box>
    </Paper>
  );
}

function renderRotatedRadiusTick(props: { x?: string | number; y?: string | number; payload?: { value?: string | number } }) {
  const x = Number(props.x ?? 0);
  const y = Number(props.y ?? 0);
  const value = props.payload?.value ?? "";
  return (
    <text
      x={x}
      y={y}
      fill="var(--mantine-color-text)"
      fontSize={DASHBOARD_CHART_CONFIG.tickFontSize}
      fontFamily={CHART_FONT_FAMILY}
      textAnchor="middle"
      dominantBaseline="central"
      transform={`rotate(90, ${x}, ${y})`}
    >
      {value}
    </text>
  );
}

function buildRapidDomainSummary(assessments: AssessmentRecord[], translateSchema: (key: string) => string) {
  const rapidRecords = assessments.filter((assessment) => assessment.mode === "rapid");
  const buildDomain = (sectionKey: "rapid_movement" | "rapid_social" | "rapid_mental") => {
    const section = rapidSections.find((item) => item.key === sectionKey);
    if (!section) return [];

    return section.items.map((item) => {
      let sum = 0;
      let count = 0;
      for (const assessment of rapidRecords) {
        const raw = assessment.scores[item.key]?.score;
        if (typeof raw === "number") {
          sum += raw;
          count += 1;
        }
      }
      return {
        label: translateSchema(`${item.key}.title`),
        value: count ? Number((sum / count).toFixed(2)) : 0
      };
    });
  };

  return {
    movement: buildDomain("rapid_movement"),
    social: buildDomain("rapid_social"),
    mental: buildDomain("rapid_mental")
  };
}
