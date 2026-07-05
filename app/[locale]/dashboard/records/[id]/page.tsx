"use client";

import { useEffect, useMemo, useState, use } from "react";
import type { ReactNode } from "react";
import { Badge, Box, Group, Loader, Paper, SimpleGrid, Stack, Table, Text, Title, useMantineTheme } from "@mantine/core";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { createGdsVocabularyPack, GdsIcons, PageHeader, SectionPanel, SemanticButton } from "@sovereignsquad/gds/client";
import { Link } from "@/i18n/navigation";
import { PdfService } from "@/lib/pdf-service";
import { getUsers } from "@/services/user-service";
import { withDisplayNamesForReport } from "@/lib/report-user-display";
import { 
  PolarAngleAxis, 
  PolarGrid, 
  PolarRadiusAxis, 
  Radar, 
  RadarChart, 
  ResponsiveContainer
} from "recharts";
import { sectionsForMode } from "@/lib/readiness-schema";
import { getDomainMainColor, type AssessmentDomain } from "@/theme/domain-colors";
import { hasTrackerScores } from "@/lib/assessment-compat";
import { formatScore } from "@/lib/utils";
import { getProductColor } from "@/lib/product-ui-contracts";
import { ReadinessGauge } from "@/components/analytics/ReadinessGauge";
import { MaturityRadarChart } from "@/components/analytics/MaturityRadarChart";
import type { CheckInRecord } from "@/types/check-in";

const RADAR_CHART_HEIGHT = 200;
const RADAR_TICK_FONT_SIZE = 10;
const CHART_FONT_FAMILY = 'var(--font-noto-sans), "Noto Sans", Helvetica, Arial, sans-serif';
const LEGACY_DOMAIN_ITEMS: Record<AssessmentDomain, Array<{ key: string; title: string }>> = {
  movement: [
    { key: "technical_pillar", title: "technicalPillarTitle" },
    { key: "tactical_pillar", title: "tacticalPillarTitle" },
    { key: "physical_pillar", title: "physicalPillarTitle" }
  ],
  social: [
    { key: "psychological_pillar", title: "mentalPillarTitle" }
  ],
  mental: [
    { key: "cognitive_pillar", title: "cognitivePillarTitle" },
    { key: "readiness_pillar", title: "physicalPillarTitle" }
  ]
};

export default function RecordDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations("Assessment");
  const tc = useTranslations("Common");
  const ts = useTranslations("Schema");
  const td = useTranslations("Dashboard");
  const tr = useTranslations("Report");
  const searchParams = useSearchParams();
  const shouldPrint = searchParams.get("print") === "true";

  const [record, setRecord] = useState<CheckInRecord | null>(null);
  const [history, setHistory] = useState<CheckInRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const recordsActionPack = useMemo(
    () =>
      createGdsVocabularyPack("records", {
        update: {
          defaultMessage: tc("update"),
          icon: GdsIcons.Edit
        },
        downloadPdf: {
          defaultMessage: td("exportReportPdf"),
          icon: GdsIcons.Print
        },
        view: {
          defaultMessage: tc("view"),
          icon: GdsIcons.Eye
        },
        download: {
          defaultMessage: tc("download"),
          icon: GdsIcons.Download
        }
      }),
    [tc, td]
  );

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
      const users = await getUsers();
      const printableRecord = withDisplayNamesForReport(record, users);
      // Always export the full report (with longitudinal history). The previous
      // ?format=original branch silently produced a history-less report, and
      // there was no UI to choose it — so trainers always got the lesser export.
      // Fetch history fresh here so the export never races the background load
      // (?print=true auto-export, or an immediate click before history resolves)
      // and silently drops trends (GH-476 review). Fall back to whatever loaded.
      let exportHistory = history;
      if (record.childId) {
        try {
          const res = await fetch(`/api/athletes/${record.childId}/history`);
          const historyData = await res.json();
          if (Array.isArray(historyData.assessments)) exportHistory = historyData.assessments;
        } catch {
          // keep the already-loaded history state on fetch failure
        }
      }
      await PdfService.generateMapReport(printableRecord, t, tc, ts, tr, exportHistory);
    } catch (error) {
      console.error("PDF generation failed:", error);
    } finally {
      setDownloadingPdf(false);
    }
  };

  useEffect(() => {
    fetch(`/api/check-ins/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setRecord(data.assessment);
        if (data.assessment?.childId) {
          fetch(`/api/athletes/${data.assessment.childId}/history`)
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
    movement: buildDomainRadarData("movement", record, t),
    social: buildDomainRadarData("social", record, t),
    mental: buildDomainRadarData("mental", record, t)
  };

  const baseline = history.length > 0 ? history[history.length - 1] : null;
  const deltaRadarData = [
    { subject: ts("movement"), A: record.computed.movementAverage || 0, B: baseline?.computed.movementAverage || 0, fullMark: 5 },
    { subject: ts("social"), A: record.computed.socialAverage || 0, B: baseline?.computed.socialAverage || 0, fullMark: 5 },
    { subject: ts("mental"), A: record.computed.mentalAverage || 0, B: baseline?.computed.mentalAverage || 0, fullMark: 5 },
  ];

  return (
    <Box className="record-detail">
      <Stack gap="md" mb="lg">
        <PageHeader
          title={t("recordTitle")}
          subtitle={`${record.session.date} · ${record.child.name}`}
          actions={
            <Group gap="xs" wrap="wrap" className="mobile-actions-stack">
              <Link href={`/dashboard/assessment?id=${record._id}`} style={{ textDecoration: "none" }}>
                <SemanticButton action="records:update" color={getProductColor("dashboard", "primaryAction")} variant="light" vocabularyPacks={[recordsActionPack]} />
              </Link>
              <SemanticButton
                action="records:downloadPdf"
                color={getProductColor("dashboard", "primaryAction")}
                variant="outline"
                onClick={() => void downloadPdf()}
                loading={downloadingPdf}
                vocabularyPacks={[recordsActionPack]}
              />
            </Group>
          }
        />
      </Stack>
      <SectionPanel title={t("reportPreview")}>
        <Stack gap="xl">
          <Group gap="md" align="center" justify="space-between" wrap="wrap">
            <Group gap="md">
              <Link href="/dashboard" aria-label={tc("goHome")} style={{ display: "inline-flex", textDecoration: "none" }}>
                <Image src="/images/habigoal_logo.png" alt="Habigoal" width={72} height={72} priority />
              </Link>
              <Box>
                <Title order={3} fw={800}>{t("reportPrintTitle")}</Title>
                <Text size="sm" c="dimmed">{record.child.name}</Text>
              </Box>
            </Group>
            <Box style={{ textAlign: "right" }}>
              <MetaRow label={tc("date")} value={reportDate} />
              <MetaRow label={t("tableTime")} value={reportTime} />
            </Box>
          </Group>

          <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg" style={{ alignItems: "flex-end" }}>
            <Box>
              <ReadinessGauge 
                value={record.computed.ski || 0} 
                title={td("sportReadiness")}
                subtitle={td("readinessStatus")}
              />
            </Box>
            <Box style={{ gridColumn: "span 2" }}>
              <MaturityRadarChart 
                title={td("deltaProfile")}
                data={deltaRadarData}
                emptyLabel={td("chartNoData")}
                labels={{
                  A: td("currentAssessment"),
                  B: history.length > 1 ? td("baselineAssessment") : undefined
                }}
              />
            </Box>
          </SimpleGrid>
          <Text size="sm" c="dimmed">
            {td("insightRecordReadiness", {
              ski: formatScore(record.computed.ski || 0),
              movement: formatScore(record.computed.movementAverage || 0),
              social: formatScore(record.computed.socialAverage || 0),
              mental: formatScore(record.computed.mentalAverage || 0)
            })}
          </Text>

          <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
            <Metric label={ts("movement")} value={formatScore(record.computed.movementAverage)} />
            <Metric label={ts("social")} value={formatScore(record.computed.socialAverage)} />
            <Metric label={ts("mental")} value={formatScore(record.computed.mentalAverage)} />
            <Metric label={ts("ski")} value={formatScore(record.computed.ski)} />
          </SimpleGrid>
          <Text size="sm" c="dimmed">
            {td("insightRecordDomainSummary", {
              movement: formatScore(record.computed.movementAverage || 0),
              social: formatScore(record.computed.socialAverage || 0),
              mental: formatScore(record.computed.mentalAverage || 0)
            })}
          </Text>

          <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md" mt="md">
            <RecordRadarChart title={ts("movement")} data={radarData.movement} domain="movement" />
            <RecordRadarChart title={ts("social")} data={radarData.social} domain="social" />
            <RecordRadarChart title={ts("mental")} data={radarData.mental} domain="mental" />
          </SimpleGrid>
        </Stack>
      </SectionPanel>

      {sections.map((section) => (
        <SectionPanel key={section.key} title={t(section.title)}>
          <Stack gap="md" hiddenFrom="sm">
            {section.items.map((item) => {
              const entry = record.scores[item.key];
              return (
                <ResponsiveDataCard key={item.key} title={t(item.title)}>
                  <ResponsiveDataRow label={t("tableScore")} value={<Badge color={getProductColor("dashboard", "primaryAction")} variant="light" size="lg">{entry?.score ?? "—"}</Badge>} />
                  <ResponsiveDataRow label={t("tableNote")} value={<Text size="sm" c="dimmed">{entry?.note || tc("emptyValue")}</Text>} />
                </ResponsiveDataCard>
              );
            })}
          </Stack>
          <Paper withBorder radius="md" style={{ overflow: "hidden" }} visibleFrom="sm">
            <Table striped highlightOnHover verticalSpacing="sm">
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
                      <Table.Td fw={500}>{t(item.title)}</Table.Td>
                      <Table.Td style={{ textAlign: "right" }}>
                        <Badge color={getProductColor("dashboard", "primaryAction")} variant="light" size="lg">
                          {entry?.score ?? "—"}
                        </Badge>
                      </Table.Td>
                      <Table.Td><Text size="sm" c="dimmed">{entry?.note || tc("emptyValue")}</Text></Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          </Paper>
        </SectionPanel>
      ))}

      <SectionPanel title={t("evidenceImages")}>
        {record.attachments.length === 0 ? (
          <Text size="sm" c="dimmed" fs="italic">
            {t("noImages")}
          </Text>
        ) : (
          <SimpleGrid cols={{ base: 1, xs: 2, sm: 3, md: 4, lg: 5 }} spacing="md">
            {record.attachments.map((attachment) => {
              const isPdf = attachment.mimeType === "application/pdf" || attachment.url.toLowerCase().endsWith(".pdf");
              return (
                <Paper key={attachment.id} withBorder p="xs" radius="md" style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {isPdf ? (
                    <Box style={{ height: 120, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--mantine-color-gray-0)", borderRadius: "var(--mantine-radius-md)" }}>
                       <Stack align="center" gap={4}>
                         <Text style={{ fontSize: 32 }}>📄</Text>
                         <Text size="sm" c="dimmed" style={{ textAlign: "center", paddingInline: 4 }} lineClamp={1}>{attachment.name || t("pdfReportFallback")}</Text>
                       </Stack>
                    </Box>
                  ) : (
                    <Image
                      src={attachment.thumbUrl || attachment.url}
                      alt={attachment.name || t("evidenceImageAlt")}
                      width={160}
                      height={120}
                      style={{ width: "100%", height: "auto", borderRadius: "var(--mantine-radius-md)", aspectRatio: "4/3", objectFit: "cover" }}
                      unoptimized
                    />
                  )}
                  <Box>
                    <Text size="sm" c="dimmed" mb={4}>
                      {new Date(attachment.uploadedAt).toLocaleDateString()}
                    </Text>
                    <a
                      href={attachment.url}
                      {...(isPdf ? { download: attachment.name || t("reportFileName") } : {})}
                      target="_blank"
                      rel="noreferrer"
                      style={{ textDecoration: "none", display: "block" }}
                    >
                      <SemanticButton
                        action={isPdf ? "records:download" : "records:view"}
                        variant="light"
                        size="sm"
                        fullWidth
                        vocabularyPacks={[recordsActionPack]}
                      />
                    </a>
                  </Box>
                </Paper>
              );
            })}
          </SimpleGrid>
        )}
      </SectionPanel>

      <SectionPanel title={t("professionalNotes")}>
        <Stack gap="md">
          <Box>
            <Text size="sm" fw={600} mb={4}>
              {t("generalObservation")}
            </Text>
            <Text size="sm" c="dimmed">
              {record.notes.general || tc("emptyValue")}
            </Text>
          </Box>
          <Box>
            <Text size="sm" fw={600} mb={4}>
              {t("adaptationNeeds")}
            </Text>
            <Text size="sm" c="dimmed">
              {record.notes.adaptations || tc("emptyValue")}
            </Text>
          </Box>
        </Stack>
      </SectionPanel>

      <SectionPanel title={t("historyLog")}>
        <Stack gap="xs">
          <Text size="sm">
            <strong>{t("recordedAt")}:</strong> {new Date(record.createdAt).toLocaleString(undefined, {
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
              <strong>{t("updatedAt")}:</strong> {new Date(timestamp).toLocaleString(undefined, {
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
              <strong>{t("updatedAt")}:</strong> {new Date(record.updatedAt).toLocaleString(undefined, {
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
      </SectionPanel>
    </Box>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Paper withBorder p="md" radius="md" style={{ flex: 1 }}>
      <Text size="sm" c="dimmed" fw={500} style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </Text>
      <Text size="xl" mt={4} fw={800} color={getProductColor("dashboard", "primaryAction")}>
        {value}
      </Text>
    </Paper>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <Group gap={4} justify="flex-end">
      <Text size="sm" fw={700}>{label}:</Text>
      <Text size="sm">{value}</Text>
    </Group>
  );
}

function ResponsiveDataCard({ title, children, onClick }: { title: string; children: ReactNode; onClick?: () => void }) {
  return (
    <Box style={{ width: "100%", cursor: onClick ? "pointer" : undefined }} onClick={onClick}>
      <SectionPanel title={title}>
        <Stack gap="md">{children}</Stack>
      </SectionPanel>
    </Box>
  );
}

function ResponsiveDataRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Stack gap={4}>
      <Text size="sm" fw={700} c="var(--text-secondary)" style={{ textTransform: "uppercase", letterSpacing: "0.04em" }}>
        {label}
      </Text>
      <Box style={{ width: "100%", minWidth: 0 }}>{value}</Box>
    </Stack>
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

  if (data.length < 3) {
    return (
      <Paper withBorder p="sm">
        <Text size="sm" fw={700} mb="xs" c="dimmed" style={{ textTransform: "uppercase" }}>
          {title}
        </Text>
        <Stack justify="center" gap="md" style={{ minHeight: RADAR_CHART_HEIGHT }}>
          {data.map((point) => (
            <Box key={point.label}>
              <Group justify="space-between" align="flex-end" gap="sm" mb={6}>
                <Text size="sm" fw={600} style={{ flex: 1, minWidth: 0 }}>
                  {point.label}
                </Text>
                <Badge color={getProductColor("dashboard", "primaryAction")} variant="light" size="lg">
                  {formatScore(point.value)}
                </Badge>
              </Group>
              <Box
                style={{
                  height: 10,
                  borderRadius: 999,
                  background: theme.colors.gray[2],
                  overflow: "hidden"
                }}
              >
                <Box
                  style={{
                    width: `${Math.max(0, Math.min(100, (point.value / 5) * 100))}%`,
                    height: "100%",
                    borderRadius: 999,
                    background: domainColor
                  }}
                />
              </Box>
            </Box>
          ))}
        </Stack>
      </Paper>
    );
  }

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
              tick={(props) => renderWrappedAngleTick(props)}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 5]}
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

function buildDomainRadarData(
  domain: AssessmentDomain,
  record: CheckInRecord,
  translate: (key: string) => string
) {
  if (!hasTrackerScores(record)) {
    return LEGACY_DOMAIN_ITEMS[domain]
      .map((item) => {
        const score = record.scores[item.key]?.score;
        return {
          label: translate(item.title),
          value: typeof score === "number" ? score : 0
        };
      })
      .filter((item) => item.value > 0);
  }

  const sections = sectionsForMode(record.mode).filter((section) => section.domain === domain);
  return sections.flatMap((section) =>
    section.items.map((item) => {
      const score = record.scores[item.key]?.score;
      return {
        label: translate(item.title),
        value: typeof score === "number" ? score : 0
      };
    })
  );
}

function renderWrappedAngleTick(props: {
  x?: string | number;
  y?: string | number;
  cx?: string | number;
  cy?: string | number;
  payload?: { value?: string };
}) {
  const x = Number(props.x ?? 0);
  const y = Number(props.y ?? 0);
  const cx = Number(props.cx ?? 0);
  const value = props.payload?.value ?? "";
  const words = value.split(" ");
  const lines: string[] = [];

  for (const word of words) {
    const current = lines[lines.length - 1];
    if (!current || `${current} ${word}`.length > 18) {
      if (lines.length < 2) {
        lines.push(word);
      } else {
        lines[1] = `${lines[1]}…`;
        break;
      }
    } else {
      lines[lines.length - 1] = `${current} ${word}`;
    }
  }

  return (
    <text
      x={x}
      y={y}
      fill="var(--mantine-color-text)"
      fontSize={RADAR_TICK_FONT_SIZE}
      fontFamily={CHART_FONT_FAMILY}
      textAnchor={x < cx - 8 ? "end" : x > cx + 8 ? "start" : "middle"}
    >
      {lines.map((line, index) => (
        <tspan key={`${line}-${index}`} x={x} dy={index === 0 ? 0 : 11}>
          {line}
        </tspan>
      ))}
    </text>
  );
}
