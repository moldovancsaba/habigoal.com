"use client";

import { useEffect, useMemo, useState } from "react";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionCard } from "@/components/ui/SectionCard";
import type { AssessmentRecord } from "@/types/assessment";
import type { User } from "@/services/user-service";

type DashboardData = {
  users: User[];
  assessments: AssessmentRecord[];
  childrenCount: number;
};

function monthLabel(date: Date) {
  return new Intl.DateTimeFormat(undefined, { month: "short" }).format(date);
}

export function MainDashboard() {
  const t = useTranslations("Dashboard");
  const tc = useTranslations("Common");
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
    const months = Array.from({ length: 6 }, (_, idx) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - idx), 1);
      return { key: `${d.getFullYear()}-${d.getMonth() + 1}`, label: monthLabel(d), count: 0 };
    });
    const indexByKey = new Map(months.map((m) => [m.key, m]));
    for (const record of data?.assessments ?? []) {
      const createdAt = new Date(record.createdAt);
      const key = `${createdAt.getFullYear()}-${createdAt.getMonth() + 1}`;
      const hit = indexByKey.get(key);
      if (hit) hit.count += 1;
    }
    const max = Math.max(1, ...months.map((m) => m.count));
    return months.map((m) => ({ ...m, pct: (m.count / max) * 100 }));
  }, [data]);

  const userRoleStats = useMemo(() => {
    const users = data?.users ?? [];
    const conductors = users.filter((u) => u.roles.includes("conductor")).length;
    const observers = users.filter((u) => u.roles.includes("observer")).length;
    const total = Math.max(1, users.length);
    return [
      { label: t("conductors"), count: conductors, pct: (conductors / total) * 100 },
      { label: t("observers"), count: observers, pct: (observers / total) * 100 }
    ];
  }, [data, t]);

  const avgRecordsPerChild = useMemo(() => {
    const children = data?.childrenCount ?? 0;
    const records = data?.assessments.length ?? 0;
    if (children === 0) return "0.0";
    return (records / children).toFixed(1);
  }, [data]);

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

      <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <SectionCard title={t("recordsChartTitle")} subheader={t("recordsChartSubtitle")}>
            <RecordsLineChart points={recordsByMonth} />
          </SectionCard>
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <SectionCard title={t("usersChartTitle")} subheader={t("usersChartSubtitle")}>
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
  const width = 560;
  const height = 180;
  const padding = { top: 12, right: 16, bottom: 36, left: 16 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const values = points.map((p) => p.count);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(1, max - min);
  const yMin = min === max ? Math.max(0, min - 1) : min;
  const yMax = min === max ? max + 1 : max;

  const chartPoints = points.map((point, index) => {
    const x = padding.left + (index / Math.max(1, points.length - 1)) * chartW;
    const normalized = (point.count - yMin) / Math.max(1, yMax - yMin);
    const y = padding.top + chartH - normalized * chartH;
    return { ...point, x, y };
  });

  const polylinePoints = chartPoints.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <Stack spacing={1}>
      <Box sx={{ width: "100%", overflowX: "auto" }}>
        <Box component="svg" viewBox={`0 0 ${width} ${height}`} sx={{ width: "100%", minWidth: 340, height: "auto", display: "block" }}>
          <line x1={padding.left} y1={padding.top + chartH} x2={width - padding.right} y2={padding.top + chartH} stroke="currentColor" opacity={0.25} />
          <polyline fill="none" stroke="currentColor" strokeWidth="2.5" opacity={0.95} points={polylinePoints} />
          {chartPoints.map((point) => (
            <g key={point.key}>
              <circle cx={point.x} cy={point.y} r="4" fill="currentColor" />
              <text x={point.x} y={height - 18} textAnchor="middle" fontSize="11" fill="currentColor" opacity="0.72">
                {point.label}
              </text>
              <text x={point.x} y={height - 4} textAnchor="middle" fontSize="12" fill="currentColor" opacity="0.88">
                {point.count}
              </text>
            </g>
          ))}
        </Box>
      </Box>
      <Typography variant="caption" color="text.secondary">
        Relative Y range: {yMin} - {yMax} (span {span})
      </Typography>
    </Stack>
  );
}

function UserRolePieChart({
  items
}: {
  items: Array<{ label: string; count: number; pct: number }>;
}) {
  const total = Math.max(1, items.reduce((sum, item) => sum + item.count, 0));
  const first = items[0]?.count ?? 0;
  const firstPct = (first / total) * 100;
  const pieStyle = `conic-gradient(var(--mui-palette-secondary-main) 0% ${firstPct}%, var(--mui-palette-primary-main) ${firstPct}% 100%)`;

  return (
    <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ alignItems: "center" }}>
      <Box sx={{ width: 150, height: 150, borderRadius: "50%", background: pieStyle, border: 1, borderColor: "divider" }} />
      <Stack spacing={1} sx={{ width: "100%" }}>
        {items.map((item, idx) => (
          <Stack key={item.label} direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  bgcolor: idx === 0 ? "secondary.main" : "primary.main"
                }}
              />
              <Typography variant="body2">{item.label}</Typography>
            </Stack>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {item.count}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Stack>
  );
}
