"use client";

import { useEffect, useState, use } from "react";
import { Box, Button, Group, Loader, Paper, Stack, Table, Text, useMantineTheme } from "@mantine/core";
import { useParams, useSearchParams } from "next/navigation";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
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
  const { locale } = useParams();
  const searchParams = useSearchParams();
  const shouldPrint = searchParams.get("print") === "true";
  const reportFormat = searchParams.get("format") || "original";

  const [record, setRecord] = useState<AssessmentRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  useEffect(() => {
    fetch(`/api/assessments/${id}`)
      .then((res) => res.json())
      .then((data) => setRecord(data.assessment))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (record && shouldPrint && !downloadingPdf) {
      // Small delay to ensure charts are rendered
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

  const sections = sectionsForMode(record.mode);
  const recordedAt = new Date(record.createdAt);
  const reportDate = new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(recordedAt);
  const reportTime = new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit"
  }).format(recordedAt);
  

  const radarData = {
    movement: buildRadarData("rapid_movement", record, ts),
    social: buildRadarData("rapid_social", record, ts),
    mental: buildRadarData("rapid_mental", record, ts)
  };

  async function downloadPdf() {
    const elementId = reportFormat === "map" ? "kidex-map-print-view" : "kidex-report-print-view";
    const reportElement = document.getElementById(elementId);
    if (!reportElement) return;

    setDownloadingPdf(true);
    try {
      // Temporarily show the print view for capture
      reportElement.style.display = "block";
      
      const canvas = await html2canvas(reportElement, {
        scale: 2, // Higher quality
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
      
      const safeName = (record?.child.name || "report").replace(/[^\w-]+/g, " ").trim();
      const fileName = reportFormat === "map" 
        ? `${safeName}  Kidex Bio-Pszicho-Szocialis Terkep.pdf`
        : `kidex_report_${safeName}_${record?.session.date}.pdf`;
      
      pdf.save(fileName);
      
      reportElement.style.display = "none";
    } catch (error) {
      console.error("PDF generation failed:", error);
    } finally {
      setDownloadingPdf(false);
    }
  }

  return (
    <Box className="record-detail print-container">
      <Stack gap="md" className="no-print" mb="lg">
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
            <Button variant="default" onClick={() => void downloadPdf()} disabled={downloadingPdf}>
              {downloadingPdf ? tc("loading") : t("downloadPdf")}
            </Button>
          }
        />
      </Stack>

      <SectionCard title={t("reportPreview")} className="no-print">
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

      {/* Hidden view for PDF generation (Original Style) */}
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
                <Text size="lg">{record.child.name}</Text>
              </Box>
            </Group>
            <Box style={{ textAlign: "right" }}>
              <Text><strong>{tc("date")}:</strong> {reportDate}</Text>
              <Text><strong>{t("conductor")}:</strong> {record.session.conductor}</Text>
            </Box>
          </Group>

          <Group grow gap="lg">
            <Paper withBorder p="md" style={{ textAlign: "center" }}>
              <Text size="sm" c="dimmed">{ts("ski")}</Text>
              <Text size="32px" fw={900}>{formatScore(record.computed.ski)}</Text>
            </Paper>
          </Group>

          <Group gap="md" wrap="nowrap">
            <Box style={{ flex: 1 }}>
              <RecordRadarChart title={ts("movement")} data={radarData.movement} domain="movement" animate={false} />
            </Box>
            <Box style={{ flex: 1 }}>
              <RecordRadarChart title={ts("social")} data={radarData.social} domain="social" animate={false} />
            </Box>
            <Box style={{ flex: 1 }}>
              <RecordRadarChart title={ts("mental")} data={radarData.mental} domain="mental" animate={false} />
            </Box>
          </Group>

          <Box>
            <Text fw={700} mb="sm" style={{ borderBottom: "2px solid #eee" }}>{t("professionalNotes")}</Text>
            <Stack gap="xs">
              <Text><strong>{t("generalObservation")}:</strong> {record.notes.general || "—"}</Text>
              <Text><strong>{t("adaptationNeeds")}:</strong> {record.notes.adaptations || "—"}</Text>
            </Stack>
          </Box>
        </Stack>
      </Box>

      {/* Hidden view for PDF generation (Map Style) */}
      <Box id="kidex-map-print-view" style={{ 
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
                {record.child.name} – {calculateAgeGroup(record.child.birthDate)} fejlesztési szakasz
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
              {record.notes.general || "—"}
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
                    <Table.Td style={{ textAlign: "center" }}>{record.scores[item.key]?.score || "—"}</Table.Td>
                    <Table.Td c="dimmed">{record.scores[item.key]?.note || "—"}</Table.Td>
                  </Table.Tr>
                ))}
                <Table.Tr bg="gray.0">
                  <Table.Td fw={800}>MOZGÁS INDEX ÁTLAG</Table.Td>
                  <Table.Td style={{ textAlign: "center" }} fw={800}>
                    {formatScore(record.computed.movementAverage)}
                  </Table.Td>
                  <Table.Td fw={700}>
                    {(record.computed.movementAverage ?? 0) >= 4 ? "Magas koordinációs és technikai potenciál" : "Fejlesztendő koordináció"}
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
                    <Table.Td style={{ textAlign: "center" }}>{record.scores[item.key]?.score || "—"}</Table.Td>
                    <Table.Td c="dimmed">{record.scores[item.key]?.note || "—"}</Table.Td>
                  </Table.Tr>
                ))}
                <Table.Tr bg="gray.0">
                  <Table.Td fw={800}>SZOCIÁLIS INDEX ÁTLAG</Table.Td>
                  <Table.Td style={{ textAlign: "center" }} fw={800}>
                    {formatScore(record.computed.socialAverage)}
                  </Table.Td>
                  <Table.Td fw={700}>
                    {(record.computed.socialAverage ?? 0) >= 4 ? "Strukturált közegben jól működő" : "Szociális támogatást igényel"}
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
                    <Table.Td style={{ textAlign: "center" }}>{record.scores[item.key]?.score || "—"}</Table.Td>
                    <Table.Td c="dimmed">{record.scores[item.key]?.note || "—"}</Table.Td>
                  </Table.Tr>
                ))}
                <Table.Tr bg="gray.0">
                  <Table.Td fw={800}>MENTÁLIS INDEX ÁTLAG</Table.Td>
                  <Table.Td style={{ textAlign: "center" }} fw={800}>
                    {formatScore(record.computed.mentalAverage)}
                  </Table.Td>
                  <Table.Td fw={700}>
                    {(record.computed.mentalAverage ?? 0) >= 4 ? "Stabil kognitív funkciók" : "Kognitív fejlesztés javasolt"}
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
                  <Text fw={700}>• Mozgás: {formatScore(record.computed.movementAverage)}</Text>
                  <Text fw={700}>• Szociális: {formatScore(record.computed.socialAverage)}</Text>
                  <Text fw={700}>• Mentális: {formatScore(record.computed.mentalAverage)}</Text>
                </Stack>
                <Box mt="xl" p="md" style={{ border: "4px solid #333", textAlign: "center" }}>
                  <Text size="lg" fw={800}>ÖSSZES SKI = {formatScore(record.computed.ski)} / 6</Text>
                </Box>
              </Box>
              <Box style={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={[
                    { subject: ts("movement"), A: record.computed.movementAverage, fullMark: 6 },
                    { subject: ts("social"), A: record.computed.socialAverage, fullMark: 6 },
                    { subject: ts("mental"), A: record.computed.mentalAverage, fullMark: 6 },
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
              {record.notes.adaptations || "Nincs rögzített fejlesztési prioritás."}
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
                <Text fw={700}>{record.session.conductor}</Text>
                <Text size="sm">Kidex Fejlesztő</Text>
              </Box>
            </Group>
          </Box>
        </Stack>
      </Box>


      {sections.map((section) => (
        <SectionCard key={section.key} title={ts(section.key)}>
          <Paper withBorder p={0}>
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

function calculateAgeGroup(birthDate: string): string {
  const birth = new Date(birthDate);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
    age--;
  }

  if (age < 3) return "0-3";
  if (age < 5) return "3-5";
  if (age < 7) return "5-7";
  if (age < 10) return "7-10";
  if (age < 12) return "10-12";
  if (age < 15) return "12-15";
  return "15+";
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
