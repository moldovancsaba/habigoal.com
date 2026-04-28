"use client";

import { useEffect, useMemo, useState } from "react";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";
import { useTranslations } from "next-intl";
import { CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionCard } from "@/components/ui/SectionCard";
import { rapidSections } from "@/lib/kidex-schema";
import type { AssessmentRecord } from "@/types/assessment";
import type { User } from "@/services/user-service";

type DashboardData = {
  users: User[];
  assessments: AssessmentRecord[];
  childrenCount: number;
};

const DASHBOARD_CHART_CONFIG = {
  monthWindow: 6,
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

function monthLabel(date: Date) {
  return new Intl.DateTimeFormat(undefined, { month: "short" }).format(date);
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

  const recordsByMonth = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: DASHBOARD_CHART_CONFIG.monthWindow }, (_, idx) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (DASHBOARD_CHART_CONFIG.monthWindow - 1 - idx), 1);
      return { key: `${d.getFullYear()}-${d.getMonth() + 1}`, label: monthLabel(d), count: 0 };
    });
    const indexByKey = new Map(months.map((m) => [m.key, m]));
    for (const record of data?.assessments ?? []) {
      const createdAt = new Date(record.createdAt);
      const key = `${createdAt.getFullYear()}-${createdAt.getMonth() + 1}`;
      const hit = indexByKey.get(key);
      if (hit) hit.count += 1;
    }
    return months;
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
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }} role="status">
        <CircularProgress aria-label={tc("loading")} />
      </Box>
    );
  }

  return (
    <Stack spacing={3}>
      <PageHeader title={t("overview")} subtitle={t("overviewSubtitle")} />

      <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
        <MetricCard label={t("totalUsers")} value={String(data?.users.length ?? 0)} />
        <MetricCard label={t("totalRecords")} value={String(data?.assessments.length ?? 0)} />
      </Stack>

      <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
        <MetricCard label={t("totalChildren")} value={String(data?.childrenCount ?? 0)} />
        <MetricCard label={t("avgRecordsPerChild")} value={avgRecordsPerChild} />
      </Stack>

      <SectionCard title={t("rapidSpiderSummaryTitle")} subheader={t("rapidSpiderSummarySubtitle")}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <RapidRadarChart title={t("rapidMovementTitle")} data={rapidDomainSummary.movement} />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <RapidRadarChart title={t("rapidSocialTitle")} data={rapidDomainSummary.social} />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <RapidRadarChart title={t("rapidMentalTitle")} data={rapidDomainSummary.mental} />
          </Box>
        </Stack>
      </SectionCard>

      <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
        <Box sx={{ flex: 1, minWidth: 0, display: "flex" }}>
          <SectionCard title={t("recordsChartTitle")} subheader={t("recordsChartSubtitle")} sx={{ width: "100%", height: "100%", mb: 0 }}>
            <RecordsLineChart points={recordsByMonth} />
          </SectionCard>
        </Box>

        <Box sx={{ flex: 1, minWidth: 0, display: "flex" }}>
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
    <Paper variant="outlined" sx={{ p: 2, flex: 1 }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h4" sx={{ fontWeight: 800 }}>
        {value}
      </Typography>
    </Paper>
  );
}

function RecordsLineChart({
  points
}: {
  points: Array<{ key: string; label: string; count: number }>;
}) {
  const theme = useTheme();
  const t = useTranslations("Dashboard");

  const values = points.map((p) => p.count);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const yMin = min === max ? Math.max(0, min - 1) : min;
  const yMax = min === max ? max + 1 : max;

  return (
    <Stack spacing={1}>
      <Box sx={{ width: "100%", height: DASHBOARD_CHART_CONFIG.chartHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={DASHBOARD_CHART_CONFIG.lineMargin}>
            <CartesianGrid stroke={theme.palette.divider} strokeDasharray="3 3" />
            <XAxis dataKey="label" stroke={theme.palette.text.secondary} tick={{ fontSize: DASHBOARD_CHART_CONFIG.tickFontSize }} />
            <YAxis
              domain={[yMin, yMax]}
              allowDecimals={false}
              stroke={theme.palette.text.secondary}
              tick={{ fontSize: DASHBOARD_CHART_CONFIG.tickFontSize }}
              width={28}
            />
            <Tooltip
              contentStyle={{
                background: theme.palette.background.paper,
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: DASHBOARD_CHART_CONFIG.tooltipRadius
              }}
            />
            <Line
              type="monotone"
              dataKey="count"
              stroke={theme.palette.primary.main}
              strokeWidth={DASHBOARD_CHART_CONFIG.lineStrokeWidth}
              dot={{ r: DASHBOARD_CHART_CONFIG.dotRadius, fill: theme.palette.primary.main }}
              activeDot={{ r: DASHBOARD_CHART_CONFIG.activeDotRadius }}
            />
          </LineChart>
        </ResponsiveContainer>
      </Box>
      <Typography variant="caption" color="text.secondary">
        {t("recordsChartYRange", { min: yMin, max: yMax })}
      </Typography>
    </Stack>
  );
}

function UserRolePieChart({
  items
}: {
  items: Array<{ label: string; count: number }>;
}) {
  const theme = useTheme();
  const chartData = items.map((item) => ({ name: item.label, value: item.count }));
  const colors = [theme.palette.secondary.main, theme.palette.primary.main];

  return (
    <Box sx={{ width: "100%", height: DASHBOARD_CHART_CONFIG.chartHeight }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip
            contentStyle={{
              background: theme.palette.background.paper,
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: DASHBOARD_CHART_CONFIG.tooltipRadius
            }}
          />
          <Legend verticalAlign="middle" align="right" layout="vertical" />
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
  data
}: {
  title: string;
  data: Array<{ label: string; value: number }>;
}) {
  const theme = useTheme();

  return (
    <Paper variant="outlined" sx={{ p: 1.5 }}>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        {title}
      </Typography>
      <Box sx={{ width: "100%", height: DASHBOARD_CHART_CONFIG.chartHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data}>
            <PolarGrid stroke={theme.palette.divider} />
            <PolarAngleAxis dataKey="label" tick={{ fontSize: 11, fill: theme.palette.text.secondary }} />
            <PolarRadiusAxis domain={[0, 6]} tickCount={4} tick={{ fill: theme.palette.text.secondary, fontSize: 10 }} />
            <Tooltip
              contentStyle={{
                background: theme.palette.background.paper,
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: DASHBOARD_CHART_CONFIG.tooltipRadius
              }}
            />
            <Radar
              dataKey="value"
              stroke={theme.palette.primary.main}
              fill={theme.palette.primary.main}
              fillOpacity={0.28}
            />
          </RadarChart>
        </ResponsiveContainer>
      </Box>
    </Paper>
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
