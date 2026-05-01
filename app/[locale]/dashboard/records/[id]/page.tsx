"use client";

import { useEffect, useState, use } from "react";
import { Box, Button, Group, Loader, Paper, Stack, Table, Text, useMantineTheme } from "@mantine/core";
import { useParams, useSearchParams } from "next/navigation";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { PdfService } from "@/lib/pdf-service";
import { 
  PolarAngleAxis, 
  PolarGrid, 
  PolarRadiusAxis, 
  Radar, 
  RadarChart, 
  ResponsiveContainer
} from "recharts";
import { PageHeader } from "@/components/ui/PageHeader";
import { rapidSections } from "@/lib/kidex-schema";
import { getDomainMainColor, type AssessmentDomain } from "@/lib/domain-colors";
import { sectionsForMode } from "@/lib/kidex-schema";
import { formatScore } from "@/lib/utils";
import { SectionCard } from "@/components/ui/SectionCard";
import type { AssessmentRecord } from "@/types/assessment";

const RADAR_CHART_HEIGHT = 200;
const RADAR_TICK_FONT_SIZE = 10;
const CHART_FONT_FAMILY = 'var(--font-noto-sans), "Noto Sans", Helvetica, Arial, sans-serif';

export default function RecordDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations("Assessment");
  const tc = useTranslations("Common");
  const ts = useTranslations("Schema");
  const td = useTranslations("Dashboard");
  const tr = useTranslations("Report");
  const { locale } = useParams();
  const searchParams = useSearchParams();
  const shouldPrint = searchParams.get("print") === "true";
  const reportFormat = searchParams.get("format") || "original";

  const [record, setRecord] = useState<AssessmentRecord | null>(null);
  const [history, setHistory] = useState<AssessmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const sections = record ? sectionsForMode(record.mode) : [];
  const recordedAt = record ? new Date(record.createdAt) : new Date();
  const reportDate = new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(recordedAt);
  const reportTime = new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit"
  }).format(recordedAt);

  const downloadPdf = async () => {
    if (!record) return;
    setDownloadingPdf(true);
    try {
      if (reportFormat === "map") {
        await PdfService.generateMapReport(record, t, tc, ts, tr, history);
      } else {
        await PdfService.generateOriginalReport(record, t, tc, ts);
      }
    } catch (error) {
      console.error("PDF generation failed:", error);
    } finally {
      setDownloadingPdf(false);
    }
  };

  useEffect(() => {
    fetch(`/api/assessments/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setRecord(data.assessment);
        if (data.assessment?.childId) {
          fetch(`/api/children/${data.assessment.childId}/history`)
            .then(r => r.json())
            .then(hData => setHistory(hData.assessments || []));
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (record && shouldPrint && !downloadingPdf) {
      const timer = setTimeout(() => {
        void downloadPdf();
      }, 500);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record, shouldPrint]);

  if (loading) {
    return (
      <Box style={{ display: "flex", justifyContent: "center", paddingBlock: "2rem" }} role="status" aria-live="polite">
        <Loader aria-label={tc("loading")} />
      </Box>
    );
  }

  if (!record) {
    return (
      <Text c="red" py="md">
        {tc("error")}
      </Text>
    );
  }

  const radarData = {
    movement: buildRadarData("rapid_movement", record, ts),
    social: buildRadarData("rapid_social", record, ts),
    mental: buildRadarData("rapid_mental", record, ts)
  };

  return (
    <Box className="record-detail">
      <Stack gap="md" mb="lg">
        <PageHeader
          title={t("recordTitle")}
          subtitle={
            <Box>
              <Text component="span">{record.session.date} · </Text>
              <Text 
                component="a" 
                href={`/${locale}/dashboard/children/${record.childId}`}
                style={{ cursor: "pointer", color: "var(--mantine-color-kidex-6)", fontWeight: 700, textDecoration: "none" }}
              >
                {record.child.name}
              </Text>
            </Box>
          }
          actions={
            <Button 
              color="kidex" 
              variant="outline" 
              onClick={() => void downloadPdf()} 
              loading={downloadingPdf}
            >
              {td("downloadPdf")}
            </Button>
          }
        />
      </Stack>

      <SectionCard title={t("reportPreview")}>
        <Stack gap="md">
          <Group gap="md" align="center" justify="space-between" wrap="wrap">
            <Group gap="md">
              <Image src="/logo.jpeg" alt="KIDEX" width={64} height={64} style={{ borderRadius: "var(--mantine-radius-md)" }} />
              <Box>
                <Text fw={800} size="xl">{t("reportPrintTitle")}</Text>
                <Text size="sm" c="dimmed">{record.child.name}</Text>
              </Box>
            </Group>
            <Box style={{ textAlign: "right" }}>
              <MetaRow label={tc("date")} value={reportDate} />
              <MetaRow label={t("tableTime")} value={reportTime} />
            </Box>
          </Group>

          <Group gap="md" style={{ flexDirection: "row", flexWrap: "wrap" }} mt="md">
            <Metric label={ts("movement")} value={formatScore(record.computed.movementAverage)} />
            <Metric label={ts("social")} value={formatScore(record.computed.socialAverage)} />
            <Metric label={ts("mental")} value={formatScore(record.computed.mentalAverage)} />
            <Metric label={ts("ski")} value={formatScore(record.computed.ski)} />
          </Group>

          <Stack gap="md" mt="xl" style={{ flexDirection: "row", flexWrap: "wrap" }}>
            <Box style={{ flex: 1, minWidth: 300 }}>
              <RecordRadarChart title={t("rapidMovementTitle")} data={radarData.movement} domain="movement" />
            </Box>
            <Box style={{ flex: 1, minWidth: 300 }}>
              <RecordRadarChart title={t("rapidSocialTitle")} data={radarData.social} domain="social" />
            </Box>
            <Box style={{ flex: 1, minWidth: 300 }}>
              <RecordRadarChart title={t("rapidMentalTitle")} data={radarData.mental} domain="mental" />
            </Box>
          </Stack>
        </Stack>
      </SectionCard>

      {sections.map((section) => (
        <SectionCard key={section.key} title={ts(section.key)}>
          <Paper withBorder p="0">
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>{t("tableObservation")}</Table.Th>
                  <Table.Th style={{ width: 100, textAlign: "right" }}>
                    {t("tableScore")}
                  </Table.Th>
                  <Table.Th>{t("tableNote")}</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {section.items.map((item) => {
                  const entry = record.scores[item.key];
                  return (
                    <Table.Tr key={item.key}>
                      <Table.Td>{ts(`${item.key}.title`)}</Table.Td>
                      <Table.Td style={{ textAlign: "right" }}>{entry?.score ?? "—"}</Table.Td>
                      <Table.Td><Text c="dimmed">{entry?.note || "—"}</Text></Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          </Paper>
        </SectionCard>
      ))}

      <SectionCard title={t("evidenceImages")}>
        {record.attachments.length === 0 ? (
          <Text size="sm" c="dimmed">
            {t("noImages")}
          </Text>
        ) : (
          <Stack gap="md" style={{ flexDirection: "row", flexWrap: "wrap" }}>
            {record.attachments.map((attachment) => {
              const isPdf = attachment.mimeType === "application/pdf" || attachment.url.toLowerCase().endsWith(".pdf");
              return (
                <Paper key={attachment.id} withBorder p="sm" style={{ width: 220, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  {isPdf ? (
                    <Box style={{ height: 132, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--mantine-color-gray-0)", borderRadius: "var(--mantine-radius-md)" }}>
                       <Stack align="center" gap={4}>
                         <Text size="xl" style={{ fontSize: 40 }}>📄</Text>
                         <Text size="sm" c="dimmed" style={{ textAlign: "center", paddingInline: 8 }}>{attachment.name || "PDF Report"}</Text>
                       </Stack>
                    </Box>
                  ) : (
                    <Image
                      src={attachment.thumbUrl || attachment.url}
                      alt={attachment.name || "Evidence image"}
                      width={196}
                      height={132}
                      style={{ width: "100%", height: "auto", borderRadius: "var(--mantine-radius-md)" }}
                      unoptimized
                    />
                  )}
                  <Box mt={8}>
                    <Text size="sm" c="dimmed" mb={4}>
                      {new Date(attachment.uploadedAt).toLocaleString()}
                    </Text>
                    <Button 
                      component="a" 
                      href={attachment.url} 
                      download={attachment.name || "report.pdf"}
                      target="_blank" 
                      rel="noreferrer" 
                      variant="light"
                      size="sm"
                      fullWidth
                    >
                      {isPdf ? tc("download") : tc("view")}
                    </Button>
                  </Box>
                </Paper>
              );
            })}
          </Stack>
        )}
      </SectionCard>

      <SectionCard title={t("professionalNotes")}>
        <Stack gap="md">
          <Box>
            <Text size="sm" fw={600} mb={4}>
              {t("generalObservation")}
            </Text>
            <Text size="sm" c="dimmed">
              {record.notes.general || "—"}
            </Text>
          </Box>
          <Box>
            <Text size="sm" fw={600} mb={4}>
              {t("adaptationNeeds")}
            </Text>
            <Text size="sm" c="dimmed">
              {record.notes.adaptations || "—"}
            </Text>
          </Box>
        </Stack>
      </SectionCard>

      <SectionCard title={t("historyLog") || "History Log"}>
        <Stack gap="xs">
          <Text size="sm">
            <strong>{t("recordedAt") || "Recorded at"}:</strong> {new Date(record.createdAt).toLocaleString(undefined, {
              hour: "2-digit",
              minute: "2-digit",
              timeZoneName: "short",
              day: "2-digit",
              month: "2-digit",
              year: "numeric"
            })}
          </Text>
          {record.updateHistory?.map((timestamp, idx) => (
            <Text key={idx} size="sm">
              <strong>{t("updatedAt") || "Updated at"}:</strong> {new Date(timestamp).toLocaleString(undefined, {
                hour: "2-digit",
                minute: "2-digit",
                timeZoneName: "short",
                day: "2-digit",
                month: "2-digit",
                year: "numeric"
              })}
            </Text>
          ))}
          {!record.updateHistory?.length && record.updatedAt !== record.createdAt && (
            <Text size="sm">
              <strong>{t("updatedAt") || "Updated at"}:</strong> {new Date(record.updatedAt).toLocaleString(undefined, {
                hour: "2-digit",
                minute: "2-digit",
                timeZoneName: "short",
                day: "2-digit",
                month: "2-digit",
                year: "numeric"
              })}
            </Text>
          )}
        </Stack>
      </SectionCard>
    </Box>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Paper withBorder p="md" style={{ flex: "1 1 140px", minWidth: 120 }}>
      <Text size="sm" c="dimmed">
        {label}
      </Text>
      <Text fw={700} size="lg">
        {value}
      </Text>
    </Paper>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <Text size="sm" style={{ whiteSpace: "nowrap" }}>
      <strong>{label}:</strong> {value}
    </Text>
  );
}

function RecordRadarChart({
  title,
  data,
  domain,
  animate = true
}: {
  title: string;
  data: Array<{ label: string; value: number }>;
  domain: AssessmentDomain;
  animate?: boolean;
}) {
  const theme = useMantineTheme();
  const domainColor = getDomainMainColor(domain);
  return (
    <Paper withBorder p="sm">
      <Text size="sm" fw={700} mb="xs" c="dimmed" style={{ textTransform: "uppercase" }}>
        {title}
      </Text>
      <Box style={{ width: "100%", height: RADAR_CHART_HEIGHT }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data}>
            <PolarGrid />
            <PolarAngleAxis
              dataKey="label"
              tick={{ fontSize: RADAR_TICK_FONT_SIZE, fill: "var(--mantine-color-text)", fontFamily: CHART_FONT_FAMILY }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 6]}
              tickCount={4}
              tick={(props) => renderRotatedRadiusTick(props)}
              stroke={theme.colors.gray[6]}
            />
            <Radar 
              dataKey="value" 
              stroke={domainColor} 
              fill={domainColor} 
              fillOpacity={0.25} 
              isAnimationActive={animate}
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
      fontSize={RADAR_TICK_FONT_SIZE}
      fontFamily={CHART_FONT_FAMILY}
      textAnchor="middle"
      dominantBaseline="central"
      transform={`rotate(90, ${x}, ${y})`}
    >
      {value}
    </text>
  );
}

function buildRadarData(sectionKey: string, record: AssessmentRecord, translateSchema: (key: string) => string) {
  const section = rapidSections.find((item) => item.key === sectionKey);
  if (!section) return [];

  return section.items.map((item) => {
    const score = record.scores[item.key]?.score;
    return {
      label: translateSchema(`${item.key}.title`),
      value: typeof score === "number" ? score : 0
    };
  });
}
