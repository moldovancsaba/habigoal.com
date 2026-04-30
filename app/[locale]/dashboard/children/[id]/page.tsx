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
      
      // Multi-page support if needed, but for now we fit on one long page or multiple A4
      // The current print view is designed to be multi-page if we add page breaks
      pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight);
      
      const safeName = (data.child.name || "report").replace(/[^\w-]+/g, " ").trim();
      pdf.save(`${safeName}  Kidex Bio-Pszicho-Szocialis Terkep.pdf`);
      
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
            {downloadingPdf ? tc("loading") : tc("downloadMap")}
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

      {/* HIDDEN PRINT VIEW - BIO-PSYCHO-SOCIAL MAP STYLE */}
      {data.assessments.length > 0 && (
        <Box id="kidex-report-print-view" style={{ 
          display: "none", 
          width: "210mm", 
          padding: "20mm", 
          background: "white", 
          color: "black",
          position: "absolute",
          left: "-10000px",
          fontFamily: "'Times New Roman', Times, serif"
        }}>
          <Stack gap="xl">
            {/* Header / Page 1 */}
            <Stack align="center" gap="xl" mb={60}>
              <Image src="/logo.jpeg" alt="KIDEX" width={180} height={180} />
              <Box style={{ textAlign: "center" }}>
                <Text size="sm" mt="xl" style={{ maxWidth: 600, margin: "0 auto" }}>
                  Az alábbi értékelés a fejlesztő pedagógus strukturált megfigyelése, a szülői 
                  pszicho-szociális teszt eredmény kiegészítés, valamint a Kidex rendszer és az 
                  ESÉSIK megfigyelési protokoll alapján készült.
                </Text>
                <Text fw={900} size="42px" mt="xl" style={{ lineHeight: 1.1, textTransform: "uppercase" }}>
                  KIDEX BIO–PSZICHO–SZOCIÁLIS TÉRKÉP
                </Text>
                <Text size="24px" mt="lg" fw={700}>
                  {data.child.name} – {calculateAgeGroup(data.child.birthDate)} fejlesztési szakasz
                </Text>
              </Box>

              <Box mt={40} style={{ width: "100%", textAlign: "left" }}>
                <Text fw={700} mb="sm">Skála: 1–6</Text>
                <Stack gap={2}>
                  <Text size="sm">- 1 jelentős eltérés</Text>
                  <Text size="sm">- 2 komoly támogatást igényel</Text>
                  <Text size="sm">- 3 fejleszthető alap</Text>
                  <Text size="sm">- 4 életkorhoz közeli, stabil</Text>
                  <Text size="sm">- 5 jó szint, átlag vagy átlag feletti, erős</Text>
                  <Text size="sm">- 6 kiemelkedően magas</Text>
                </Stack>
              </Box>
            </Stack>

            {/* I. Section */}
            <Box>
              <Text fw={900} size="22px" mb="lg" style={{ borderBottom: "2px solid #333", paddingBottom: 4 }}>
                I. KIDEX ALAP MEGFIGYELÉS ÉS ELEMZÉS
              </Text>
              <Text fw={700} mb="xs">Általános megfigyelés</Text>
              <Text style={{ textAlign: "justify" }}>
                {data?.assessments?.[0]?.notes?.general || "—"}
              </Text>
            </Box>

            {/* II. Section - Mozgásprofil */}
            <Box mt="xl">
              <Text fw={900} size="22px" mb="lg" style={{ borderBottom: "2px solid #333", paddingBottom: 4 }}>
                II. MOZGÁSPROFIL – SPORTSPECIFIKUS ÉRTÉKELÉS (50%)
              </Text>
              <Text fw={700} mb="sm">Mozgás index (1–6)</Text>
              <Table withTableBorder withColumnBorders>
                <Table.Thead>
                  <Table.Tr bg="gray.1">
                    <Table.Th>Terület</Table.Th>
                    <Table.Th style={{ width: 80 }}>Érték</Table.Th>
                    <Table.Th>Indoklás</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {rapidSections.find(s => s.key === "rapid_movement")?.items.map(item => (
                    <Table.Tr key={item.key}>
                      <Table.Td fw={500}>{ts(`${item.key}.title`)}</Table.Td>
                      <Table.Td style={{ textAlign: "center" }}>{data?.assessments?.[0]?.scores?.[item.key]?.score || "—"}</Table.Td>
                      <Table.Td c="dimmed">{data?.assessments?.[0]?.scores?.[item.key]?.note || "—"}</Table.Td>
                    </Table.Tr>
                  ))}
                  <Table.Tr bg="gray.0">
                    <Table.Td fw={800}>MOZGÁS INDEX ÁTLAG</Table.Td>
                    <Table.Td style={{ textAlign: "center" }} fw={800}>
                      {formatScore(data?.assessments?.[0]?.computed?.movementAverage)}
                    </Table.Td>
                    <Table.Td fw={700}>
                      {(data?.assessments?.[0]?.computed?.movementAverage ?? 0) >= 4 ? "Magas koordinációs és technikai potenciál" : "Fejlesztendő koordináció"}
                    </Table.Td>
                  </Table.Tr>
                </Table.Tbody>
              </Table>
            </Box>

            {/* III. Section - Szociális */}
            <Box mt="xl">
              <Text fw={900} size="22px" mb="lg" style={{ borderBottom: "2px solid #333", paddingBottom: 4 }}>
                III. SZOCIÁLIS–ÉRZELMI PROFIL (30%)
              </Text>
              <Table withTableBorder withColumnBorders>
                <Table.Thead>
                  <Table.Tr bg="gray.1">
                    <Table.Th>Terület</Table.Th>
                    <Table.Th style={{ width: 80 }}>Érték</Table.Th>
                    <Table.Th>Jelentés</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {rapidSections.find(s => s.key === "rapid_social")?.items.map(item => (
                    <Table.Tr key={item.key}>
                      <Table.Td fw={500}>{ts(`${item.key}.title`)}</Table.Td>
                      <Table.Td style={{ textAlign: "center" }}>{data?.assessments?.[0]?.scores?.[item.key]?.score || "—"}</Table.Td>
                      <Table.Td c="dimmed">{data?.assessments?.[0]?.scores?.[item.key]?.note || "—"}</Table.Td>
                    </Table.Tr>
                  ))}
                  <Table.Tr bg="gray.0">
                    <Table.Td fw={800}>SZOCIÁLIS INDEX ÁTLAG</Table.Td>
                    <Table.Td style={{ textAlign: "center" }} fw={800}>
                      {formatScore(data?.assessments?.[0]?.computed?.socialAverage)}
                    </Table.Td>
                    <Table.Td fw={700}>
                      {(data?.assessments?.[0]?.computed?.socialAverage ?? 0) >= 4 ? "Strukturált közegben jól működő" : "Szociális támogatást igényel"}
                    </Table.Td>
                  </Table.Tr>
                </Table.Tbody>
              </Table>
            </Box>

            {/* IV. Section - Mentális */}
            <Box mt="xl">
              <Text fw={900} size="22px" mb="lg" style={{ borderBottom: "2px solid #333", paddingBottom: 4 }}>
                IV. PSZICHÉS–MENTÁLIS PROFIL (20%)
              </Text>
              <Table withTableBorder withColumnBorders>
                <Table.Thead>
                  <Table.Tr bg="gray.1">
                    <Table.Th>Terület</Table.Th>
                    <Table.Th style={{ width: 80 }}>Érték</Table.Th>
                    <Table.Th>Jelentés</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {rapidSections.find(s => s.key === "rapid_mental")?.items.map(item => (
                    <Table.Tr key={item.key}>
                      <Table.Td fw={500}>{ts(`${item.key}.title`)}</Table.Td>
                      <Table.Td style={{ textAlign: "center" }}>{data?.assessments?.[0]?.scores?.[item.key]?.score || "—"}</Table.Td>
                      <Table.Td c="dimmed">{data?.assessments?.[0]?.scores?.[item.key]?.note || "—"}</Table.Td>
                    </Table.Tr>
                  ))}
                  <Table.Tr bg="gray.0">
                    <Table.Td fw={800}>MENTÁLIS INDEX ÁTLAG</Table.Td>
                    <Table.Td style={{ textAlign: "center" }} fw={800}>
                      {formatScore(data?.assessments?.[0]?.computed?.mentalAverage)}
                    </Table.Td>
                    <Table.Td fw={700}>
                      {(data?.assessments?.[0]?.computed?.mentalAverage ?? 0) >= 4 ? "Stabil kognitív funkciók" : "Kognitív fejlesztés javasolt"}
                    </Table.Td>
                  </Table.Tr>
                </Table.Tbody>
              </Table>
            </Box>

            {/* V. Section - SKI */}
            <Box mt="xl" style={{ pageBreakBefore: "always" }}>
              <Text fw={900} size="22px" mb="lg" style={{ borderBottom: "2px solid #333", paddingBottom: 4 }}>
                V. ÖSSZESÍTETT SPORTÁGI KOMPATIBILITÁSI INDEX (SKI)
              </Text>
              <Group grow align="start" gap="xl">
                <Box>
                  <Stack gap="xs">
                    <Text fw={700}>• Mozgás: {formatScore(data?.assessments?.[0]?.computed?.movementAverage)}</Text>
                    <Text fw={700}>• Szociális: {formatScore(data?.assessments?.[0]?.computed?.socialAverage)}</Text>
                    <Text fw={700}>• Mentális: {formatScore(data?.assessments?.[0]?.computed?.mentalAverage)}</Text>
                  </Stack>
                  <Box mt="xl" p="md" style={{ border: "4px solid #333", textAlign: "center" }}>
                    <Text size="lg" fw={800}>ÖSSZES SKI = {formatScore(data?.assessments?.[0]?.computed?.ski)} / 6</Text>
                  </Box>
                </Box>
                <Box style={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={[
                      { subject: ts("movement"), A: data?.assessments?.[0]?.computed?.movementAverage, fullMark: 6 },
                      { subject: ts("social"), A: data?.assessments?.[0]?.computed?.socialAverage, fullMark: 6 },
                      { subject: ts("mental"), A: data?.assessments?.[0]?.computed?.mentalAverage, fullMark: 6 },
                    ]}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="subject" />
                      <PolarRadiusAxis angle={30} domain={[0, 6]} />
                      <Radar name="Child" dataKey="A" stroke="var(--mantine-color-kidex-6)" fill="var(--mantine-color-kidex-6)" fillOpacity={0.6} />
                    </RadarChart>
                  </ResponsiveContainer>
                </Box>
              </Group>
            </Box>

            {/* VI. & VII. & VIII. Sections - Placeholders for Professional content */}
            <Box mt="xl">
               <Text fw={900} size="22px" mb="lg" style={{ borderBottom: "2px solid #333", paddingBottom: 4 }}>
                VI. SPORTÁG SZŰKÍTÉS (KIDEX LOGIKA)
              </Text>
              <Text style={{ fontStyle: "italic" }}>
                A Kidex logika alapján javasolt sportágak listája a felmérés eredményei alapján kerül összeállításra.
              </Text>
            </Box>

            <Box mt="xl">
               <Text fw={900} size="22px" mb="lg" style={{ borderBottom: "2px solid #333", paddingBottom: 4 }}>
                VII. FEJLESZTÉSI PRIORITÁS (12 HÓNAP)
              </Text>
              <Text>
                {data?.assessments?.[0]?.notes?.adaptations || "Nincs rögzített fejlesztési prioritás."}
              </Text>
            </Box>

            <Box mt={60} style={{ borderTop: "1px solid #ccc", paddingTop: 40 }}>
              <Group justify="space-between">
                <Box style={{ textAlign: "center" }}>
                  <Text fw={700}>Vígh Milán</Text>
                  <Text size="sm">Elnök</Text>
                </Box>
                <Box style={{ textAlign: "center" }}>
                   <Image src="/logo.jpeg" alt="KIDEX APPROVED" width={100} height={40} style={{ opacity: 0.5 }} />
                </Box>
                <Box style={{ textAlign: "center" }}>
                  <Text fw={700}>{data?.assessments?.[0]?.session?.conductor}</Text>
                  <Text size="sm">Kidex Fejlesztő</Text>
                </Box>
              </Group>
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
