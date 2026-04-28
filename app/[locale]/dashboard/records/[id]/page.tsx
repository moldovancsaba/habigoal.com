"use client";

import { useEffect, useState, use } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Link from "@mui/material/Link";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { PageHeader } from "@/components/ui/PageHeader";
import { sectionsForMode } from "@/lib/kidex-schema";
import { formatScore } from "@/lib/utils";
import { SectionCard } from "@/components/ui/SectionCard";
import type { AssessmentRecord } from "@/types/assessment";

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
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }} role="status" aria-live="polite">
        <CircularProgress aria-label={tc("loading")} />
      </Box>
    );
  }

  if (!record) {
    return (
      <Typography color="error" sx={{ py: 4 }}>
        {tc("error")}
      </Typography>
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

      doc.setFontSize(16);
      doc.text(t("reportPrintTitle"), 38, 16);
      doc.setFontSize(11);
      doc.text(currentRecord.child.name, 38, 22);
      doc.setFontSize(10);
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
        styles: { fontSize: 10 }
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
        styles: { fontSize: 9 },
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
          styles: { fontSize: 11, fontStyle: "bold" }
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
          styles: { fontSize: 9 },
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
        styles: { fontSize: 9 },
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
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        className="no-print"
        sx={{ mb: 3, justifyContent: "space-between", alignItems: { sm: "flex-start" } }}
      >
        <PageHeader
          title={t("recordTitle")}
          subtitle={`${record.session.date} · ${record.child.name}`}
          actions={
            <Button variant="outlined" onClick={() => void downloadPdf()} disabled={downloadingPdf}>
              {downloadingPdf ? tc("loading") : t("downloadPdf")}
            </Button>
          }
        />
      </Stack>

      <SectionCard title={t("reportPreview")} className="no-print">
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ alignItems: { md: "center" }, justifyContent: "space-between" }}>
          <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
            <Image src="/logo.jpeg" alt="KIDEX" width={64} height={64} className="report-logo" />
            <Box>
              <Typography variant="h5" component="h2" sx={{ fontWeight: 800 }}>
                {t("reportPrintTitle")}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {record.child.name}
              </Typography>
            </Box>
          </Stack>
          <Box className="report-meta-grid">
            <MetaRow label={tc("date")} value={reportDate} />
            <MetaRow label={t("tableTime")} value={reportTime} />
            <MetaRow label={t("conductor")} value={record.session.conductor || "—"} />
            <MetaRow label={t("observers")} value={record.session.observers || "—"} />
          </Box>
        </Stack>
      </SectionCard>

      <Box className="only-print print-report-header">
        <Stack direction="row" spacing={2} sx={{ alignItems: "center", justifyContent: "space-between" }}>
          <Image src="/logo.jpeg" alt="KIDEX" width={72} height={72} className="report-logo" />
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              {t("reportPrintTitle")}
            </Typography>
            <Typography variant="body1">
              {record.child.name}
            </Typography>
          </Box>
          <Box className="report-meta-grid">
            <MetaRow label={tc("date")} value={reportDate} />
            <MetaRow label={t("tableTime")} value={reportTime} />
            <MetaRow label={t("conductor")} value={record.session.conductor || "—"} />
            <MetaRow label={t("observers")} value={record.session.observers || "—"} />
          </Box>
        </Stack>
      </Box>

      <Stack direction="row" spacing={2} useFlexGap sx={{ mb: 3, flexWrap: "wrap" }} className="print-metrics-grid">
        <Metric label={ts("movement")} value={formatScore(record.computed.movementAverage)} />
        <Metric label={ts("social")} value={formatScore(record.computed.socialAverage)} />
        <Metric label={ts("mental")} value={formatScore(record.computed.mentalAverage)} />
        <Metric label={ts("ski")} value={formatScore(record.computed.ski)} />
      </Stack>

      <SectionCard title={t("setupTitle")}>
        <Stack spacing={1} className="print-setup-grid">
          <Typography variant="body2" className="print-meta-row">
            <strong>{t("childName")}:</strong> {record.child.name}
          </Typography>
          <Typography variant="body2" className="print-meta-row">
            <strong>{t("birthDate")}:</strong> {record.child.birthDate}
          </Typography>
          <Typography variant="body2" className="print-meta-row">
            <strong>{t("ageGroup")}:</strong> {record.child.ageGroup}
          </Typography>
          <Typography variant="body2" className="print-meta-row">
            <strong>{t("mode")}:</strong> {record.mode}
          </Typography>
          <Typography variant="body2" className="print-meta-row">
            <strong>{tc("date")}:</strong> {reportDate}
          </Typography>
          <Typography variant="body2" className="print-meta-row">
            <strong>{t("tableTime")}:</strong> {reportTime}
          </Typography>
          <Typography variant="body2" className="print-meta-row">
            <strong>{t("location")}:</strong> {record.session.location}
          </Typography>
          <Typography variant="body2" className="print-meta-row">
            <strong>{t("conductor")}:</strong> {record.session.conductor}
          </Typography>
          <Typography variant="body2" className="print-meta-row">
            <strong>{t("observers")}:</strong> {record.session.observers || "—"}
          </Typography>
          <Typography variant="body2" className="print-meta-row">
            <strong>{t("context")}:</strong> {contextLabelMap[record.session.context]}
          </Typography>
          <Typography variant="body2" className="print-meta-row">
            <strong>{t("groupSize")}:</strong> {record.session.groupSize || "—"}
          </Typography>
          <Typography variant="body2" className="print-meta-row">
            <strong>{t("lastUpdated")}:</strong> {updatedTime}
          </Typography>
        </Stack>
      </SectionCard>

      {sections.map((section) => (
        <SectionCard key={section.key} title={ts(section.key)}>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t("tableObservation")}</TableCell>
                  <TableCell align="right" sx={{ width: 100 }}>
                    {t("tableScore")}
                  </TableCell>
                  <TableCell>{t("tableNote")}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {section.items.map((item) => {
                  const entry = record.scores[item.key];
                  return (
                    <TableRow key={item.key}>
                      <TableCell>{ts(`${item.key}.title`)}</TableCell>
                      <TableCell align="right">{entry?.score ?? "—"}</TableCell>
                      <TableCell sx={{ color: "text.secondary" }}>{entry?.note || "—"}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </SectionCard>
      ))}

      <SectionCard title={t("evidenceImages")}>
        {record.attachments.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            {t("noImages")}
          </Typography>
        ) : (
          <Stack direction="row" spacing={2} useFlexGap sx={{ flexWrap: "wrap" }}>
            {record.attachments.map((attachment) => (
              <Paper key={attachment.id} variant="outlined" sx={{ p: 1.25, width: 220 }}>
                <Image
                  src={attachment.thumbUrl || attachment.url}
                  alt={attachment.name || "Evidence image"}
                  width={196}
                  height={132}
                  style={{ width: "100%", height: "auto", borderRadius: 8 }}
                  unoptimized
                />
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.75, display: "block" }}>
                  {new Date(attachment.uploadedAt).toLocaleString()}
                </Typography>
                <Link href={attachment.url} target="_blank" rel="noreferrer" variant="body2" sx={{ mt: 0.5, display: "inline-block" }}>
                  {tc("view")}
                </Link>
              </Paper>
            ))}
          </Stack>
        )}
      </SectionCard>

      <SectionCard title={t("professionalNotes")}>
        <Stack spacing={2}>
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              {t("generalObservation")}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {record.notes.general || "—"}
            </Typography>
          </Box>
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              {t("adaptationNeeds")}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {record.notes.adaptations || "—"}
            </Typography>
          </Box>
        </Stack>
      </SectionCard>
    </Box>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Paper variant="outlined" sx={{ p: 2, flex: "1 1 140px", minWidth: 120 }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h6" sx={{ fontWeight: 700 }}>
        {value}
      </Typography>
    </Paper>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <Typography variant="body2" sx={{ whiteSpace: "nowrap" }}>
      <strong>{label}:</strong> {value}
    </Typography>
  );
}
