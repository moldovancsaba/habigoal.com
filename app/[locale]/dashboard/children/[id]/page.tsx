"use client";

import { useEffect, useState, use } from "react";
import { Box, Button, Group, Loader, Paper, Stack, Table, Text, useMantineTheme } from "@mantine/core";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Bar, BarChart, CartesianGrid, Cell, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { PageHeader } from "@/components/ui/PageHeader";
import { rapidSections } from "@/lib/kidex-schema";
import { calculateTrend, type TrendPoint } from "@/lib/utils/trends";
import { getStandardForAgeGroup } from "@/lib/standards";
import { calculateAgeGroup } from "@/lib/utils/age";
import { formatScore } from "@/lib/utils";
import { SectionCard } from "@/components/ui/SectionCard";
import { getDomainMainColor, type AssessmentDomain } from "@/lib/domain-colors";
import type { AssessmentRecord } from "@/types/assessment";
import type { ChildProfile } from "@/repositories/child.repository";

const RADAR_CHART_HEIGHT = 220;
const RADAR_TICK_FONT_SIZE = 12;
const CHART_FONT_FAMILY = 'var(--font-noto-sans), "Noto Sans", Helvetica, Arial, sans-serif';

export default function ChildHistoryPage({ params }: { params: Promise<{ id: string; locale: string }> }) {
  const { id, locale } = use(params);
  const t = useTranslations("Assessment");
  const tc = useTranslations("Common");
  const ts = useTranslations("Schema");

  const [data, setData] = useState<{ child: ChildProfile; assessments: AssessmentRecord[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  useEffect(() => {
    fetch(`/api/children/${id}/history`)
      .then((res) => res.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [id]);

  async function downloadPdf() {
    const reportElement = document.getElementById("kidex-report-print-view");
    if (!reportElement || !data || data.assessments.length === 0) return;

    setDownloadingPdf(true);
    try {
      reportElement.style.display = "block";
      
      const canvas = await html2canvas(reportElement, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff"
      });
      
      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });
      
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight);
      
      const safeName = (data.child.name || "report").replace(/[^\w-]+/g, "_");
      pdf.save(`kidex_report_${safeName}_${data.assessments[0].session.date}.pdf`);
      
      reportElement.style.display = "none";
    } catch (error) {
      console.error("PDF generation failed:", error);
    } finally {
      setDownloadingPdf(false);
    }
  }

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
      <PageHeader 
        title={data.child.name} 
        subtitle={data.child.birthDate} 
        actions={
          <Button 
            color="kidex" 
            onClick={() => void downloadPdf()} 
            disabled={data.assessments.length === 0 || downloadingPdf}
          >
            {downloadingPdf ? tc("loading") : t("reportPrintTitle")}
          </Button>
        }
      />

      <SectionCard title={t("longitudinalTrends")}>
        <Stack gap="xl">
          {trend.length > 0 ? (
            <>
              <TrendBarChart 
                title={ts("movement")} 
                data={trend} 
                dataKey="movement" 
                target={standard?.movement.target} 
                domain="movement" 
                locale={locale}
              />
              <TrendBarChart 
                title={ts("social")} 
                data={trend} 
                dataKey="social" 
                target={standard?.social.target} 
                domain="social" 
                locale={locale}
              />
              <TrendBarChart 
                title={ts("mental")} 
                data={trend} 
                dataKey="mental" 
                target={standard?.mental.target} 
                domain="mental" 
                locale={locale}
              />
            </>
          ) : (
            <Text c="dimmed">{t("noHistory")}</Text>
          )}
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
                <Table.Tr 
                  key={a._id} 
                  onClick={() => window.location.href = `/${locale}/dashboard/records/${a._id}`}
                  style={{ cursor: "pointer" }}
                >
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
                  {assessment.attachments.map((attachment) => {
                    const isPdf = attachment.mimeType === "application/pdf" || attachment.url.toLowerCase().endsWith(".pdf");
                    return (
                      <Paper key={attachment.id} withBorder p="xs" style={{ width: 180, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                        {isPdf ? (
                          <Box style={{ height: 110, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--mantine-color-gray-0)", borderRadius: "var(--mantine-radius-md)" }}>
                             <Stack align="center" gap={4}>
                               <Text size="xl" style={{ fontSize: 40 }}>📄</Text>
                               <Text size="sm" c="dimmed" style={{ textAlign: "center", paddingInline: 8 }}>{attachment.name || "PDF Report"}</Text>
                             </Stack>
                          </Box>
                        ) : (
                          <Image
                            src={attachment.thumbUrl || attachment.url}
                            alt={attachment.name || "Evidence image"}
                            width={160}
                            height={110}
                            style={{ width: "100%", height: "auto", borderRadius: "var(--mantine-radius-md)" }}
                            unoptimized
                          />
                        )}
                        <Button 
                          component="a" 
                          href={attachment.url} 
                          download={attachment.name || "report.pdf"}
                          target="_blank" 
                          rel="noreferrer" 
                          variant="light"
                          size="sm"
                          mt={8}
                          fullWidth
                        >
                          {isPdf ? tc("download") : tc("view")}
                        </Button>
                      </Paper>
                    );
                  })}
                </Stack>
              </Paper>
            ))}
          </Stack>
        )}
      </SectionCard>

      {/* HIDDEN PRINT VIEW (Original Style) */}
      {data.assessments.length > 0 && (
        <Box id="kidex-report-print-view" style={{ 
          display: "none", 
          width: "210mm", 
          padding: "15mm", 
          background: "white", 
          color: "black",
          position: "absolute",
          left: "-10000px"
        }}>
          <Stack gap="xl">
            <Group justify="space-between" align="start">
              <Group gap="md">
                <Image src="/logo.jpeg" alt="KIDEX" width={80} height={80} />
                <Box>
                  <Text fw={900} size="28px">{t("reportPrintTitle")}</Text>
                  <Text size="lg">{data.child.name}</Text>
                </Box>
              </Group>
              <Box style={{ textAlign: "right" }}>
                <Text><strong>{tc("date")}:</strong> {data.assessments[0].session.date}</Text>
                <Text><strong>{t("conductor")}:</strong> {data.assessments[0].session.conductor}</Text>
              </Box>
            </Group>

            <Group grow gap="lg">
              <Paper withBorder p="md" style={{ textAlign: "center" }}>
                <Text size="sm" c="dimmed">{ts("ski")}</Text>
                <Text size="32px" fw={900}>{formatScore(data.assessments[0].computed.ski)}</Text>
              </Paper>
            </Group>

            <Group gap="md" wrap="nowrap">
              <Box style={{ flex: 1 }}>
                <RecordRadarChart title={ts("movement")} data={buildRadarData("rapid_movement", data.assessments[0], ts)} domain="movement" animate={false} />
              </Box>
              <Box style={{ flex: 1 }}>
                <RecordRadarChart title={ts("social")} data={buildRadarData("rapid_social", data.assessments[0], ts)} domain="social" animate={false} />
              </Box>
              <Box style={{ flex: 1 }}>
                <RecordRadarChart title={ts("mental")} data={buildRadarData("rapid_mental", data.assessments[0], ts)} domain="mental" animate={false} />
              </Box>
            </Group>

            <Box>
              <Text fw={700} mb="sm" style={{ borderBottom: "2px solid #eee" }}>{t("professionalNotes")}</Text>
              <Stack gap="xs">
                <Text><strong>{t("generalObservation")}:</strong> {data.assessments[0].notes.general || "—"}</Text>
                <Text><strong>{t("adaptationNeeds")}:</strong> {data.assessments[0].notes.adaptations || "—"}</Text>
              </Stack>
            </Box>
          </Stack>
        </Box>
      )}
    </Stack>
  );
}

function TrendBarChart({
  title,
  data,
  dataKey,
  target,
  domain,
  locale
}: {
  title: string;
  data: TrendPoint[];
  dataKey: keyof Omit<TrendPoint, "date">;
  target?: number;
  domain: AssessmentDomain;
  locale: string;
}) {
  const barColor = getDomainMainColor(domain);

  return (
    <Paper withBorder p="md">
      <Stack gap="xs">
        <Group justify="space-between" align="center">
          <Text fw={700} size="lg">{title}</Text>
          {target && (
            <Text size="sm" c="dimmed">
              Target: <Text component="span" fw={700} c="blue">{formatScore(target)}</Text>
            </Text>
          )}
        </Group>
        <Box style={{ width: "100%", height: 180 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 10, fill: "var(--mantine-color-text)", fontFamily: CHART_FONT_FAMILY }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                domain={[0, 6]} 
                tick={{ fontSize: 10, fill: "var(--mantine-color-text)", fontFamily: CHART_FONT_FAMILY }}
                axisLine={false}
                tickLine={false}
                width={30}
              />
              <Tooltip 
                cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                contentStyle={{ 
                  borderRadius: 'var(--mantine-radius-md)',
                  border: '1px solid var(--mantine-color-default-border)',
                  fontFamily: CHART_FONT_FAMILY
                }}
              />
              <Bar 
                dataKey={dataKey} 
                radius={[4, 4, 0, 0]} 
                barSize={40}
                onClick={(data) => {
                  if (data && data.id) {
                    window.location.href = `/${locale}/dashboard/records/${data.id}`;
                  }
                }}
                style={{ cursor: "pointer" }}
              >
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={barColor} 
                    style={{ transition: "opacity 0.2s" }}
                    onMouseEnter={(e: React.MouseEvent) => { (e.target as SVGElement).setAttribute("style", "opacity: 0.8; transition: opacity 0.2s"); }}
                    onMouseLeave={(e: React.MouseEvent) => { (e.target as SVGElement).setAttribute("style", "opacity: 1; transition: opacity 0.2s"); }}
                  />
                ))}
              </Bar>
              {target && (
                <ReferenceLine 
                  y={target} 
                  stroke="var(--mantine-color-blue-filled)" 
                  strokeDasharray="3 3" 
                  label={{ 
                    position: 'right', 
                    value: 'T', 
                    fill: 'var(--mantine-color-blue-filled)', 
                    fontSize: 10,
                    fontWeight: 700 
                  }} 
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </Stack>
    </Paper>
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
      <Text size="sm" fw={600} mb="xs">
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
            <Tooltip />
            <Radar dataKey="value" stroke={domainColor} fill={domainColor} fillOpacity={0.25} />
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
      <Box style={{ width: "100%", height: 180 }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data}>
            <PolarGrid />
            <PolarAngleAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: "var(--mantine-color-text)", fontFamily: CHART_FONT_FAMILY }}
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
