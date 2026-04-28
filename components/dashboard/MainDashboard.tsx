"use client";

import { useEffect, useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { SectionCard } from "@/components/ui/SectionCard";
import { COMPANY_INFO } from "@/lib/company";
import type { AssessmentRecord } from "@/types/assessment";
import type { User } from "@/services/user-service";

type DashboardData = {
  users: User[];
  assessments: AssessmentRecord[];
};

function monthLabel(date: Date) {
  return new Intl.DateTimeFormat(undefined, { month: "short" }).format(date);
}

export function MainDashboard({ appVersion }: { appVersion: string }) {
  const t = useTranslations("Dashboard");
  const tc = useTranslations("Common");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void Promise.all([
      fetch("/api/users").then((r) => r.json() as Promise<{ users: User[] }>),
      fetch("/api/assessments").then((r) => r.json() as Promise<{ assessments: AssessmentRecord[] }>)
    ])
      .then(([usersData, assessmentsData]) => {
        setData({ users: usersData.users ?? [], assessments: assessmentsData.assessments ?? [] });
      })
      .catch(() => setData({ users: [], assessments: [] }))
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

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }} role="status">
        <CircularProgress aria-label={tc("loading")} />
      </Box>
    );
  }

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 800 }}>
          {t("overview")}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t("overviewSubtitle")}
        </Typography>
      </Box>

      <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
        <MetricCard label={t("totalUsers")} value={String(data?.users.length ?? 0)} />
        <MetricCard label={t("totalRecords")} value={String(data?.assessments.length ?? 0)} />
      </Stack>

      <Stack direction={{ xs: "column", xl: "row" }} spacing={2}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <SectionCard title={t("recordsChartTitle")} subheader={t("recordsChartSubtitle")}>
            <Stack direction="row" spacing={1.25} sx={{ alignItems: "flex-end", minHeight: 170 }}>
              {recordsByMonth.map((item) => (
                <Box key={item.key} sx={{ flex: 1, textAlign: "center" }}>
                  <Box
                    sx={{
                      height: `${Math.max(8, item.pct)}%`,
                      minHeight: 14,
                      borderRadius: 1,
                      bgcolor: "primary.main",
                      transition: "height 0.3s ease"
                    }}
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.75, display: "block" }}>
                    {item.label}
                  </Typography>
                  <Typography variant="caption" sx={{ fontWeight: 700 }}>
                    {item.count}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </SectionCard>
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <SectionCard title={t("usersChartTitle")} subheader={t("usersChartSubtitle")}>
            <Stack spacing={2}>
              {userRoleStats.map((item) => (
                <Box key={item.label}>
                  <Stack direction="row" sx={{ justifyContent: "space-between", mb: 0.5 }}>
                    <Typography variant="body2">{item.label}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {item.count}
                    </Typography>
                  </Stack>
                  <Box sx={{ height: 12, borderRadius: 999, bgcolor: "action.hover", overflow: "hidden" }}>
                    <Box
                      sx={{
                        width: `${item.pct}%`,
                        height: "100%",
                        bgcolor: "secondary.main"
                      }}
                    />
                  </Box>
                </Box>
              ))}
            </Stack>
          </SectionCard>
        </Box>
      </Stack>

      <SectionCard title={t("legalAndCompany")}>
        <Stack spacing={1.5}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
            <Button component={Link} href="/dashboard/legal/gtc" variant="outlined">
              {t("gtc")}
            </Button>
            <Button component={Link} href="/dashboard/legal/privacy" variant="outlined">
              {t("privacyPolicy")}
            </Button>
          </Stack>
          <Typography variant="body2">
            <strong>{t("appVersion")}:</strong> {appVersion}
          </Typography>
          <Typography variant="body2">
            <strong>{t("company")}:</strong> {COMPANY_INFO.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {COMPANY_INFO.address}
          </Typography>
        </Stack>
      </SectionCard>
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
