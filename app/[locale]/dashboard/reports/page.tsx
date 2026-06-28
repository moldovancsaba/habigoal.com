"use client";

import { useState, useEffect } from "react";
import { Stack, Text, Group, Select, Box, Paper } from "@mantine/core";
import { PageHeader, SectionPanel, SemanticButton, StateBlock } from "@doneisbetter/gds/client";
import { useTranslations } from "next-intl";
import type { AthleteProfile } from "@/types/athlete";
import type { AthleteReport } from "@/services/reporting.service";
import { PdfService, type TwinReportLabels } from "@/lib/pdf-service";

interface ReportRow {
  id: string;
  athleteName: string;
  date: string;
  type: string;
  report: AthleteReport;
}

type TeamReport = { generatedAt: string; athleteCount: number; reports: AthleteReport[] };

export default function ReportsHubPage() {
  const t = useTranslations("Reports");
  const [athletes, setAthletes] = useState<AthleteProfile[]>([]);
  const [selectedAthlete, setSelectedAthlete] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generatingTeam, setGeneratingTeam] = useState(false);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [teamReport, setTeamReport] = useState<TeamReport | null>(null);

  // PDF labels are presentation copy — localized here and passed to PdfService
  // so the renderer itself stays locale-agnostic.
  const pdfLabels: TwinReportLabels = {
    title: t("pdf.title"),
    generatedAt: t("pdf.generatedAt"),
    dateRange: t("pdf.dateRange"),
    summary: t("pdf.summary"),
    keyMetrics: t("pdf.keyMetrics"),
    metric: t("pdf.metric"),
    value: t("pdf.value"),
    guidance: t("pdf.guidance"),
    coachNotes: t("pdf.coachNotes"),
    sources: t("pdf.sources"),
    none: t("pdf.none"),
    teamTitle: t("pdf.teamTitle"),
    athleteCount: t("pdf.athleteCount")
  };

  useEffect(() => {
    fetch("/api/athletes")
      .then((res) => res.json())
      .then((data) => setAthletes(Array.isArray(data) ? data : data.athletes ?? []));
  }, []);

  const handleGenerate = async () => {
    if (!selectedAthlete) return;
    setGenerating(true);
    try {
      const res = await fetch(`/api/reports/athlete/${selectedAthlete}`);
      if (!res.ok) throw new Error("Report generation failed");
      const report = (await res.json()) as AthleteReport;
      const athlete = athletes.find((a) => a._id === selectedAthlete);
      setReports([
        {
          id: `${selectedAthlete}-${report.reportDate}`,
          athleteName: athlete?.name ?? t("athleteFallback"),
          date: report.reportDate.slice(0, 10),
          type: t("reportType"),
          report
        },
        ...reports
      ]);
      setSelectedAthlete(null);
    } catch {
      // keep UI stable
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateTeam = async () => {
    setGeneratingTeam(true);
    try {
      const res = await fetch("/api/reports/team");
      if (!res.ok) throw new Error("Team report failed");
      setTeamReport((await res.json()) as TeamReport);
    } catch {
      // keep UI stable
    } finally {
      setGeneratingTeam(false);
    }
  };

  const nameById = (): Record<string, string> =>
    Object.fromEntries(athletes.filter((a) => a._id).map((a) => [a._id as string, a.name]));

  return (
    <Stack gap="xl" pb="xl">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      <SectionPanel title={t("generateAthleteTitle")}>
        <Paper withBorder p="md">
          <Group align="flex-end" grow>
            <Select
              label={t("selectAthlete")}
              placeholder={t("selectAthletePlaceholder")}
              data={athletes.map((a) => ({ value: a._id || "", label: a.name }))}
              value={selectedAthlete}
              onChange={setSelectedAthlete}
            />
            <Box style={{ flexGrow: 0 }}>
              <SemanticButton action="start" onClick={handleGenerate} loading={generating} disabled={!selectedAthlete}>
                {t("generate")}
              </SemanticButton>
            </Box>
          </Group>
        </Paper>
      </SectionPanel>

      <SectionPanel title={t("teamTitle")}>
        <Paper withBorder p="md">
          <Group justify="space-between" align="center">
            <Box>
              <Text fw={600}>{t("teamHeading")}</Text>
              <Text size="sm" c="dimmed">
                {teamReport
                  ? t("teamMeta", { count: teamReport.athleteCount, date: teamReport.generatedAt.slice(0, 10) })
                  : t("teamEmpty")}
              </Text>
            </Box>
            <Group>
              <SemanticButton action="start" onClick={handleGenerateTeam} loading={generatingTeam}>
                {t("generateTeam")}
              </SemanticButton>
              {teamReport ? (
                <>
                  <SemanticButton
                    action="download"
                    variant="outline"
                    onClick={() => void PdfService.generateTeamTwinReport(teamReport, pdfLabels, nameById())}
                  >
                    {t("pdf.button")}
                  </SemanticButton>
                  <SemanticButton
                    action="download"
                    variant="outline"
                    onClick={() => downloadCsv(teamReport.reports, `team-report-${Date.now()}.csv`)}
                  >
                    {t("csv")}
                  </SemanticButton>
                  <SemanticButton
                    action="download"
                    variant="outline"
                    onClick={() => downloadJson(teamReport, `team-report-${Date.now()}.json`)}
                  >
                    {t("json")}
                  </SemanticButton>
                </>
              ) : null}
            </Group>
          </Group>
        </Paper>
      </SectionPanel>

      <SectionPanel title={t("recentTitle")}>
        <Stack gap="md">
          {reports.map((row) => (
            <Paper withBorder key={row.id} p="md">
              <Group justify="space-between">
                <Box>
                  <Text fw={700} size="md">{row.athleteName}</Text>
                  <Text size="sm" c="dimmed">{t("rowMeta", { type: row.type, date: row.date })}</Text>
                </Box>
                <Group>
                  <StateBlock variant="success" title={t("ready")} />
                  <SemanticButton action="download" variant="outline" onClick={() => void PdfService.generateTwinReport(row.report, pdfLabels, row.athleteName)}>
                    {t("pdf.button")}
                  </SemanticButton>
                  <SemanticButton action="download" variant="outline" onClick={() => downloadCsv([row.report], `report-${row.id}.csv`)}>
                    {t("csv")}
                  </SemanticButton>
                  <SemanticButton action="download" variant="outline" onClick={() => downloadJson(row.report, `report-${row.id}.json`)}>
                    {t("json")}
                  </SemanticButton>
                </Group>
              </Group>
            </Paper>
          ))}
          {reports.length === 0 && (
            <StateBlock variant="info" title={t("empty")} description={t("emptyHelp")} />
          )}
        </Stack>
      </SectionPanel>
    </Stack>
  );
}

function flattenReport(report: AthleteReport): Record<string, string> {
  const flat: Record<string, string> = {
    athleteId: report.athleteId,
    reportDate: report.reportDate,
    from: report.dateRange.from,
    to: report.dateRange.to,
    summary: report.summary,
    coachNotes: report.coachNotes.join(" | "),
    guidanceCommentary: report.guidanceCommentary.replace(/\s+/g, " ").trim(),
    sourceDataNotes: report.sourceDataNotes.join(" | ")
  };
  for (const [key, value] of Object.entries(report.keyMetrics)) {
    flat[`metric:${key}`] = String(value);
  }
  return flat;
}

function downloadCsv(reports: AthleteReport[], filename: string) {
  const rows = reports.map(flattenReport);
  const columns = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const header = columns.map(escape).join(",");
  const body = rows.map((row) => columns.map((column) => escape(row[column] ?? "")).join(",")).join("\n");
  downloadBlob(`${header}\n${body}`, filename, "text/csv");
}

function downloadJson(data: unknown, filename: string) {
  downloadBlob(JSON.stringify(data, null, 2), filename, "application/json");
}

function downloadBlob(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
