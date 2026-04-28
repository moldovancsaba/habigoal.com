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
import { useTranslations } from "next-intl";
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

  return (
    <Box className="record-detail print-container">
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        className="no-print"
        sx={{ mb: 3, justifyContent: "space-between", alignItems: { sm: "flex-start" } }}
      >
        <Box>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 800 }}>
            {t("recordTitle")}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {record.session.date} · {record.child.name}
          </Typography>
        </Box>
        <Button variant="outlined" onClick={() => window.print()}>
          {t("printSavePdf")}
        </Button>
      </Stack>

      <Box className="only-print">
        <Typography variant="h4" component="h1" gutterBottom>
          {t("reportPrintTitle")}
        </Typography>
        <Typography variant="body1">
          {record.child.name} · {record.session.date}
        </Typography>
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
            <strong>{t("location")}:</strong> {record.session.location}
          </Typography>
          <Typography variant="body2">
            <strong>{t("conductor")}:</strong> {record.session.conductor}
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
