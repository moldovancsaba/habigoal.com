"use client";

import { useEffect, useState, use } from "react";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import LinearProgress from "@mui/material/LinearProgress";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";
import { calculateTrend } from "@/lib/utils/trends";
import { getStandardForAgeGroup } from "@/lib/standards";
import { calculateAgeGroup } from "@/lib/utils/age";
import { formatScore } from "@/lib/utils";
import { SectionCard } from "@/components/ui/SectionCard";
import type { AssessmentRecord } from "@/types/assessment";
import type { ChildProfile } from "@/repositories/child.repository";

export default function ChildHistoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations("Assessment");
  const tc = useTranslations("Common");
  const ts = useTranslations("Schema");

  const [data, setData] = useState<{ child: ChildProfile; assessments: AssessmentRecord[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/children/${id}/history`)
      .then((res) => res.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }} role="status">
        <CircularProgress aria-label={tc("loading")} />
      </Box>
    );
  }

  if (!data) {
    return (
      <Typography color="error" sx={{ py: 4 }}>
        {tc("error")}
      </Typography>
    );
  }

  const trend = calculateTrend(data.assessments);
  const currentAgeGroup = calculateAgeGroup(data.child.birthDate);
  const standard = getStandardForAgeGroup(currentAgeGroup || "");

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 800 }}>
          {data.child.name}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {data.child.birthDate}
        </Typography>
      </Box>

      <SectionCard title={t("longitudinalTrends")}>
        <Stack spacing={2}>
          {trend.map((point, i) => (
            <Paper key={i} variant="outlined" sx={{ p: 2 }}>
              <Stack direction={{ xs: "column", md: "row" }} spacing={2} useFlexGap sx={{ alignItems: { md: "stretch" }, flexWrap: "wrap" }}>
                <TrendMetric label={ts("movement")} value={point.movement || 0} target={standard?.movement.target} barColor="primary.main" />
                <TrendMetric label={ts("social")} value={point.social || 0} target={standard?.social.target} barColor="secondary.main" />
                <TrendMetric label={ts("mental")} value={point.mental || 0} target={standard?.mental.target} barColor="warning.main" />
              </Stack>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                {point.date}
              </Typography>
            </Paper>
          ))}
          {trend.length === 0 ? (
            <Typography color="text.secondary">{t("noHistory")}</Typography>
          ) : null}
        </Stack>
      </SectionCard>

      <SectionCard title={t("assessmentHistory")}>
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{tc("date")}</TableCell>
                <TableCell>{tc("mode")}</TableCell>
                <TableCell>{ts("movement")}</TableCell>
                <TableCell>{ts("social")}</TableCell>
                <TableCell>{ts("mental")}</TableCell>
                <TableCell>{ts("ski")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.assessments.map((a) => (
                <TableRow key={a._id}>
                  <TableCell>{a.session.date}</TableCell>
                  <TableCell>{a.mode}</TableCell>
                  <TableCell>{formatScore(a.computed.movementAverage)}</TableCell>
                  <TableCell>{formatScore(a.computed.socialAverage)}</TableCell>
                  <TableCell>{formatScore(a.computed.mentalAverage)}</TableCell>
                  <TableCell>
                    <strong>{formatScore(a.computed.ski)}</strong>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </SectionCard>
    </Stack>
  );
}

function TrendMetric({
  label,
  value,
  target,
  barColor
}: {
  label: string;
  value: number;
  target?: number;
  barColor: string;
}) {
  const pct = Math.min(100, Math.max(0, (value / 6) * 100));
  return (
    <Box sx={{ flex: "1 1 200px", minWidth: 160 }}>
      <Stack direction="row" sx={{ mb: 0.5, justifyContent: "space-between", alignItems: "baseline" }}>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          {formatScore(value)}
        </Typography>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={pct}
        sx={{
          height: 10,
          borderRadius: 1,
          bgcolor: "action.hover",
          "& .MuiLinearProgress-bar": { borderRadius: 1, bgcolor: barColor }
        }}
        aria-label={label}
      />
      {typeof target === "number" ? (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
          Target: {formatScore(target)}
        </Typography>
      ) : null}
    </Box>
  );
}
