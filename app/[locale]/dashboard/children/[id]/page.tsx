"use client";

import { useEffect, useState, use } from "react";
import { Box, Loader, Paper, Progress, Stack, Table, Text } from "@mantine/core";
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
      <Box style={{ display: "flex", justifyContent: "center", paddingBlock: "2rem" }} role="status">
        <Loader aria-label={tc("loading")} />
      </Box>
    );
  }

  if (!data) {
    return (
      <Text c="red" py="md">
        {tc("error")}
      </Text>
    );
  }

  const trend = calculateTrend(data.assessments);
  const currentAgeGroup = calculateAgeGroup(data.child.birthDate);
  const standard = getStandardForAgeGroup(currentAgeGroup || "");
  const assessmentsWithImages = data.assessments.filter((assessment) => assessment.attachments.length > 0);
  const rapidDomainSummary = buildRapidDomainSummary(data.assessments, ts);

  return (
    <Stack gap="lg">
      <PageHeader title={data.child.name} subtitle={data.child.birthDate} />

      <SectionCard title={t("longitudinalTrends")}>
        <Stack gap="md">
          {trend.map((point, i) => (
            <Paper key={i} withBorder p="md">
              <Stack gap="md" style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "stretch" }}>
                <TrendMetric label={ts("movement")} value={point.movement || 0} target={standard?.movement.target} domain="movement" />
                <TrendMetric label={ts("social")} value={point.social || 0} target={standard?.social.target} domain="social" />
                <TrendMetric label={ts("mental")} value={point.mental || 0} target={standard?.mental.target} domain="mental" />
              </Stack>
              <Text size="xs" c="dimmed" mt="xs">
                {point.date}
              </Text>
            </Paper>
          ))}
          {trend.length === 0 ? (
            <Text c="dimmed">{t("noHistory")}</Text>
          ) : null}
        </Stack>
      </SectionCard>

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

      <SectionCard title={t("assessmentHistory")}>
        <Paper withBorder p={0}>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{tc("date")}</Table.Th>
                <Table.Th>{tc("mode")}</Table.Th>
                <Table.Th>{ts("movement")}</Table.Th>
                <Table.Th>{ts("social")}</Table.Th>
                <Table.Th>{ts("mental")}</Table.Th>
                <Table.Th>{ts("ski")}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {data.assessments.map((a) => (
                <Table.Tr key={a._id}>
                  <Table.Td>{a.session.date}</Table.Td>
                  <Table.Td>{a.mode}</Table.Td>
                  <Table.Td>{formatScore(a.computed.movementAverage)}</Table.Td>
                  <Table.Td>{formatScore(a.computed.socialAverage)}</Table.Td>
                  <Table.Td>{formatScore(a.computed.mentalAverage)}</Table.Td>
                  <Table.Td>
                    <strong>{formatScore(a.computed.ski)}</strong>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Paper>
      </SectionCard>

      <SectionCard title={t("evidenceImages")}>
        {assessmentsWithImages.length === 0 ? (
          <Text c="dimmed">{t("noImages")}</Text>
        ) : (
          <Stack gap="md">
            {assessmentsWithImages.map((assessment) => (
              <Paper key={assessment._id} withBorder p="sm">
                <Text size="sm" fw={600} mb="xs">
                  {assessment.session.date}
                </Text>
                <Stack gap="sm" style={{ flexDirection: "row", flexWrap: "wrap" }}>
                  {assessment.attachments.map((attachment) => (
                    <Paper key={attachment.id} withBorder p="xs" style={{ width: 180 }}>
                      <Image
                        src={attachment.thumbUrl || attachment.url}
                        alt={attachment.name || "Evidence image"}
                        width={160}
                        height={110}
                        style={{ width: "100%", height: "auto", borderRadius: 8 }}
                        unoptimized
                      />
                      <Text component="a" href={attachment.url} target="_blank" rel="noreferrer" size="xs" mt={6} style={{ display: "inline-block" }}>
                        {tc("view")}
                      </Text>
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
  const barColor = getDomainMainColor(domain);
  const pct = Math.min(100, Math.max(0, (value / 6) * 100));
  return (
    <Box style={{ flex: "1 1 200px", minWidth: 160 }}>
      <Stack gap={4} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
        <Text size="sm" c="dimmed">
          {label}
        </Text>
        <Text fw={700}>
          {formatScore(value)}
        </Text>
      </Stack>
      <Progress
        value={pct}
        color={barColor}
        radius="sm"
        size="md"
        aria-label={label}
      />
      {typeof target === "number" ? (
        <Text size="xs" c="dimmed" mt={6}>
          Target: {formatScore(target)}
        </Text>
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
  const domainColor = getDomainMainColor(domain);
  return (
    <Paper withBorder p="sm">
      <Text size="sm" fw={600} mb="xs">
        {title}
      </Text>
      <Box style={{ width: "100%", height: 220 }}>
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
