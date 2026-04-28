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
            <Button variant="outlined" onClick={() => window.print()}>
              {t("printSavePdf")}
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
        <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
          <Image src="/logo.jpeg" alt="KIDEX" width={72} height={72} className="report-logo" />
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              {t("reportPrintTitle")}
            </Typography>
            <Typography variant="body1">
              {record.child.name}
            </Typography>
          </Box>
        </Stack>
      </Box>

      <Stack direction="row" spacing={2} useFlexGap sx={{ mb: 3, flexWrap: "wrap" }}>
        <Metric label={ts("movement")} value={formatScore(record.computed.movementAverage)} />
        <Metric label={ts("social")} value={formatScore(record.computed.socialAverage)} />
        <Metric label={ts("mental")} value={formatScore(record.computed.mentalAverage)} />
        <Metric label={ts("ski")} value={formatScore(record.computed.ski)} />
      </Stack>

      <SectionCard title={t("setupTitle")}>
        <Stack spacing={1}>
          <Typography variant="body2">
            <strong>{t("childName")}:</strong> {record.child.name}
          </Typography>
          <Typography variant="body2">
            <strong>{t("birthDate")}:</strong> {record.child.birthDate}
          </Typography>
          <Typography variant="body2">
            <strong>{t("ageGroup")}:</strong> {record.child.ageGroup}
          </Typography>
          <Typography variant="body2">
            <strong>{t("mode")}:</strong> {record.mode}
          </Typography>
          <Typography variant="body2">
            <strong>{tc("date")}:</strong> {reportDate}
          </Typography>
          <Typography variant="body2">
            <strong>{t("tableTime")}:</strong> {reportTime}
          </Typography>
          <Typography variant="body2">
            <strong>{t("location")}:</strong> {record.session.location}
          </Typography>
          <Typography variant="body2">
            <strong>{t("conductor")}:</strong> {record.session.conductor}
          </Typography>
          <Typography variant="body2">
            <strong>{t("observers")}:</strong> {record.session.observers || "—"}
          </Typography>
          <Typography variant="body2">
            <strong>{t("context")}:</strong> {contextLabelMap[record.session.context]}
          </Typography>
          <Typography variant="body2">
            <strong>{t("groupSize")}:</strong> {record.session.groupSize || "—"}
          </Typography>
          <Typography variant="body2">
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
