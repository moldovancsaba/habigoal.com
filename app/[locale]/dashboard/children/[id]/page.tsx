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
import Link from "@mui/material/Link";
import { useTheme } from "@mui/material/styles";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip } from "recharts";
import { PageHeader } from "@/components/ui/PageHeader";
import { rapidSections } from "@/lib/kidex-schema";
import { calculateTrend } from "@/lib/utils/trends";
import { getStandardForAgeGroup } from "@/lib/standards";
import { calculateAgeGroup } from "@/lib/utils/age";
import { formatScore } from "@/lib/utils";
import { SectionCard } from "@/components/ui/SectionCard";
import { getDomainMainColor, type AssessmentDomain } from "@/lib/domain-colors";
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
  const assessmentsWithImages = data.assessments.filter((assessment) => assessment.attachments.length > 0);
  const rapidDomainSummary = buildRapidDomainSummary(data.assessments, ts);

  return (
    <Stack spacing={3}>
      <PageHeader title={data.child.name} subtitle={data.child.birthDate} />

      <SectionCard title={t("longitudinalTrends")}>
        <Stack spacing={2}>
          {trend.map((point, i) => (
            <Paper key={i} variant="outlined" sx={{ p: 2 }}>
              <Stack direction={{ xs: "column", md: "row" }} spacing={2} useFlexGap sx={{ alignItems: { md: "stretch" }, flexWrap: "wrap" }}>
                <TrendMetric label={ts("movement")} value={point.movement || 0} target={standard?.movement.target} domain="movement" />
                <TrendMetric label={ts("social")} value={point.social || 0} target={standard?.social.target} domain="social" />
                <TrendMetric label={ts("mental")} value={point.mental || 0} target={standard?.mental.target} domain="mental" />
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

      <SectionCard title={t("rapidSpiderSummaryTitle")} subheader={t("rapidSpiderSummarySubtitle")}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <RapidRadarChart title={t("rapidMovementTitle")} data={rapidDomainSummary.movement} domain="movement" />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <RapidRadarChart title={t("rapidSocialTitle")} data={rapidDomainSummary.social} domain="social" />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <RapidRadarChart title={t("rapidMentalTitle")} data={rapidDomainSummary.mental} domain="mental" />
          </Box>
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

      <SectionCard title={t("evidenceImages")}>
        {assessmentsWithImages.length === 0 ? (
          <Typography color="text.secondary">{t("noImages")}</Typography>
        ) : (
          <Stack spacing={2}>
            {assessmentsWithImages.map((assessment) => (
              <Paper key={assessment._id} variant="outlined" sx={{ p: 1.5 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  {assessment.session.date}
                </Typography>
                <Stack direction="row" spacing={1.5} useFlexGap sx={{ flexWrap: "wrap" }}>
                  {assessment.attachments.map((attachment) => (
                    <Paper key={attachment.id} variant="outlined" sx={{ p: 1, width: 180 }}>
                      <Image
                        src={attachment.thumbUrl || attachment.url}
                        alt={attachment.name || "Evidence image"}
                        width={160}
                        height={110}
                        style={{ width: "100%", height: "auto", borderRadius: 8 }}
                        unoptimized
                      />
                      <Link href={attachment.url} target="_blank" rel="noreferrer" variant="caption" sx={{ mt: 0.5, display: "inline-block" }}>
                        {tc("view")}
                      </Link>
                    </Paper>
                  ))}
                </Stack>
              </Paper>
            ))}
          </Stack>
        )}
      </SectionCard>
    </Stack>
  );
}

function TrendMetric({
  label,
  value,
  target,
  domain
}: {
  label: string;
  value: number;
  target?: number;
  domain: AssessmentDomain;
}) {
  const theme = useTheme();
  const barColor = getDomainMainColor(theme, domain);
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

function RapidRadarChart({
  title,
  data,
  domain
}: {
  title: string;
  data: Array<{ label: string; value: number }>;
  domain: AssessmentDomain;
}) {
  const theme = useTheme();
  const domainColor = getDomainMainColor(theme, domain);
  return (
    <Paper variant="outlined" sx={{ p: 1.5 }}>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        {title}
      </Typography>
      <Box sx={{ width: "100%", height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data}>
            <PolarGrid />
            <PolarAngleAxis dataKey="label" tick={{ fontSize: 11 }} />
            <PolarRadiusAxis domain={[0, 6]} tickCount={4} tick={{ fontSize: 10 }} />
            <Tooltip />
            <Radar dataKey="value" stroke={domainColor} fill={domainColor} fillOpacity={0.25} />
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
