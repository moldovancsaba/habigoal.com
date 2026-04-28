"use client";

import { useEffect, useState, use } from "react";
import { Box, Button, Group, Loader, Paper, Stack, Table, Text } from "@mantine/core";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { PageHeader } from "@/components/ui/PageHeader";
import { sectionsForMode } from "@/lib/kidex-schema";
import { formatScore } from "@/lib/utils";
import { SectionCard } from "@/components/ui/SectionCard";
import type { AssessmentRecord } from "@/types/assessment";

const PDF_FONT_SIZES = {
  title: 16,
  header: 11,
  body: 10,
  compact: 9
} as const;

export default function RecordDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations("Assessment");
  const tc = useTranslations("Common");
  const ts = useTranslations("Schema");

  const [record, setRecord] = useState<AssessmentRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  useEffect(() => {
    fetch(`/api/assessments/${id}`)
      .then((res) => res.json())
      .then((data) => setRecord(data.assessment))
      .finally(() => setLoading(false));
  }, [id]);

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
  const updatedAt = new Date(record.updatedAt);
  const reportDate = new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(recordedAt);
  const reportTime = new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit"
  }).format(recordedAt);
  const updatedTime = new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(updatedAt);
  const contextLabelMap: Record<AssessmentRecord["session"]["context"], string> = {
    event: t("contextEvent"),
    structured: t("contextStructured"),
    spontaneous: t("contextSpontaneous"),
    mixed: t("contextMixed")
  };

  async function downloadPdf() {
    const currentRecord = record;
    if (!currentRecord) return;

    setDownloadingPdf(true);
    try {
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const logoDataUrl = await fetch("/logo.jpeg")
        .then((response) => response.blob())
        .then(
          (blob) =>
            new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            })
        )
        .catch(() => "");

      if (logoDataUrl) {
        doc.addImage(logoDataUrl, "JPEG", 14, 10, 20, 20);
      }

      doc.setFontSize(PDF_FONT_SIZES.title);
      doc.text(t("reportPrintTitle"), 38, 16);
      doc.setFontSize(PDF_FONT_SIZES.header);
      doc.text(currentRecord.child.name, 38, 22);
      doc.setFontSize(PDF_FONT_SIZES.body);
      doc.text(`${tc("date")}: ${reportDate}`, 140, 14);
      doc.text(`${t("tableTime")}: ${reportTime}`, 140, 19);
      doc.text(`${t("conductor")}: ${currentRecord.session.conductor || "—"}`, 140, 24);
      doc.text(`${t("observers")}: ${currentRecord.session.observers || "—"}`, 140, 29);

      autoTable(doc, {
        startY: 34,
        head: [[ts("movement"), ts("social"), ts("mental"), ts("ski")]],
        body: [[
          formatScore(currentRecord.computed.movementAverage),
          formatScore(currentRecord.computed.socialAverage),
          formatScore(currentRecord.computed.mentalAverage),
          formatScore(currentRecord.computed.ski)
        ]],
        theme: "grid",
        styles: { fontSize: PDF_FONT_SIZES.body }
      });

      autoTable(doc, {
        startY: (doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY
          ? (doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable!.finalY! + 4
          : 52,
        head: [[t("setupTitle"), ""]],
        body: [
          [t("childName"), currentRecord.child.name],
          [t("birthDate"), currentRecord.child.birthDate],
          [t("ageGroup"), currentRecord.child.ageGroup],
          [t("mode"), currentRecord.mode],
          [tc("date"), reportDate],
          [t("tableTime"), reportTime],
          [t("location"), currentRecord.session.location || "—"],
          [t("conductor"), currentRecord.session.conductor || "—"],
          [t("observers"), currentRecord.session.observers || "—"],
          [t("context"), contextLabelMap[currentRecord.session.context]],
          [t("groupSize"), currentRecord.session.groupSize || "—"],
          [t("lastUpdated"), updatedTime]
        ],
        theme: "grid",
        styles: { fontSize: PDF_FONT_SIZES.compact },
        columnStyles: { 0: { cellWidth: 55 }, 1: { cellWidth: 125 } }
      });

      for (const section of sections) {
        autoTable(doc, {
          startY: (doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY
            ? (doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable!.finalY! + 6
            : 20,
          head: [[ts(section.key), "", ""]],
          body: [],
          theme: "plain",
          styles: { fontSize: PDF_FONT_SIZES.header, fontStyle: "bold" }
        });

        autoTable(doc, {
          startY: (doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY
            ? (doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable!.finalY! + 1
            : 24,
          head: [[t("tableObservation"), t("tableScore"), t("tableNote")]],
          body: section.items.map((item) => {
                  const entry = currentRecord.scores[item.key];
            return [ts(`${item.key}.title`), `${entry?.score ?? "—"}`, entry?.note || "—"];
          }),
          theme: "grid",
          styles: { fontSize: PDF_FONT_SIZES.compact },
          columnStyles: { 0: { cellWidth: 80 }, 1: { cellWidth: 24 }, 2: { cellWidth: 86 } }
        });
      }

      autoTable(doc, {
        startY: (doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY
          ? (doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable!.finalY! + 6
          : 20,
        head: [[t("professionalNotes"), ""]],
        body: [
          [t("generalObservation"), currentRecord.notes.general || "—"],
          [t("adaptationNeeds"), currentRecord.notes.adaptations || "—"]
        ],
        theme: "grid",
        styles: { fontSize: PDF_FONT_SIZES.compact },
        columnStyles: { 0: { cellWidth: 55 }, 1: { cellWidth: 125 } }
      });

      const safeName = (currentRecord.child.name || "report").replace(/[^\w-]+/g, "_");
      doc.save(`kidex_report_${safeName}_${currentRecord.session.date || reportDate}.pdf`);
    } finally {
      setDownloadingPdf(false);
    }
  }

  return (
    <Box className="record-detail print-container">
      <Stack gap="md" className="no-print" mb="lg">
        <PageHeader
          title={t("recordTitle")}
          subtitle={`${record.session.date} · ${record.child.name}`}
          actions={
            <Button variant="default" onClick={() => void downloadPdf()} disabled={downloadingPdf}>
              {downloadingPdf ? tc("loading") : t("downloadPdf")}
            </Button>
          }
        />
      </Stack>

      <SectionCard title={t("reportPreview")} className="no-print">
        <Stack gap="md" style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
          <Group gap="md" align="center">
            <Image src="/logo.jpeg" alt="KIDEX" width={64} height={64} className="report-logo" />
            <Box>
              <Text fw={800} size="xl">
                {t("reportPrintTitle")}
              </Text>
              <Text size="sm" c="dimmed">
                {record.child.name}
              </Text>
            </Box>
          </Group>
          <Box className="report-meta-grid">
            <MetaRow label={tc("date")} value={reportDate} />
            <MetaRow label={t("tableTime")} value={reportTime} />
            <MetaRow label={t("conductor")} value={record.session.conductor || "—"} />
            <MetaRow label={t("observers")} value={record.session.observers || "—"} />
          </Box>
        </Stack>
      </SectionCard>

      <Box className="only-print print-report-header">
        <Stack gap="md" style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Image src="/logo.jpeg" alt="KIDEX" width={72} height={72} className="report-logo" />
          <Box>
            <Text size="xl" fw={700} mb="xs">
              {t("reportPrintTitle")}
            </Text>
            <Text>
              {record.child.name}
            </Text>
          </Box>
          <Box className="report-meta-grid">
            <MetaRow label={tc("date")} value={reportDate} />
            <MetaRow label={t("tableTime")} value={reportTime} />
            <MetaRow label={t("conductor")} value={record.session.conductor || "—"} />
            <MetaRow label={t("observers")} value={record.session.observers || "—"} />
          </Box>
        </Stack>
      </Box>

      <Stack gap="md" style={{ flexDirection: "row", flexWrap: "wrap" }} className="print-metrics-grid">
        <Metric label={ts("movement")} value={formatScore(record.computed.movementAverage)} />
        <Metric label={ts("social")} value={formatScore(record.computed.socialAverage)} />
        <Metric label={ts("mental")} value={formatScore(record.computed.mentalAverage)} />
        <Metric label={ts("ski")} value={formatScore(record.computed.ski)} />
      </Stack>

      <SectionCard title={t("setupTitle")}>
        <Stack gap={6} className="print-setup-grid">
          <Text size="sm" className="print-meta-row">
            <strong>{t("childName")}:</strong> {record.child.name}
          </Text>
          <Text size="sm" className="print-meta-row">
            <strong>{t("birthDate")}:</strong> {record.child.birthDate}
          </Text>
          <Text size="sm" className="print-meta-row">
            <strong>{t("ageGroup")}:</strong> {record.child.ageGroup}
          </Text>
          <Text size="sm" className="print-meta-row">
            <strong>{t("mode")}:</strong> {record.mode}
          </Text>
          <Text size="sm" className="print-meta-row">
            <strong>{tc("date")}:</strong> {reportDate}
          </Text>
          <Text size="sm" className="print-meta-row">
            <strong>{t("tableTime")}:</strong> {reportTime}
          </Text>
          <Text size="sm" className="print-meta-row">
            <strong>{t("location")}:</strong> {record.session.location}
          </Text>
          <Text size="sm" className="print-meta-row">
            <strong>{t("conductor")}:</strong> {record.session.conductor}
          </Text>
          <Text size="sm" className="print-meta-row">
            <strong>{t("observers")}:</strong> {record.session.observers || "—"}
          </Text>
          <Text size="sm" className="print-meta-row">
            <strong>{t("context")}:</strong> {contextLabelMap[record.session.context]}
          </Text>
          <Text size="sm" className="print-meta-row">
            <strong>{t("groupSize")}:</strong> {record.session.groupSize || "—"}
          </Text>
          <Text size="sm" className="print-meta-row">
            <strong>{t("lastUpdated")}:</strong> {updatedTime}
          </Text>
        </Stack>
      </SectionCard>

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
            {record.attachments.map((attachment) => (
              <Paper key={attachment.id} withBorder p="sm" style={{ width: 220 }}>
                <Image
                  src={attachment.thumbUrl || attachment.url}
                  alt={attachment.name || "Evidence image"}
                  width={196}
                  height={132}
                  style={{ width: "100%", height: "auto", borderRadius: "var(--mantine-radius-md)" }}
                  unoptimized
                />
                <Text size="sm" c="dimmed" mt={8}>
                  {new Date(attachment.uploadedAt).toLocaleString()}
                </Text>
                <Text component="a" href={attachment.url} target="_blank" rel="noreferrer" size="sm" mt={6} style={{ display: "inline-block" }}>
                  {tc("view")}
                </Text>
              </Paper>
            ))}
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
