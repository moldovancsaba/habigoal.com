"use client";

import { useState, useEffect } from "react";
import { Stack, Text, Group, Select, Box, Paper } from "@mantine/core";
import { PageHeader, SectionPanel, SemanticButton, StateBlock } from "@doneisbetter/gds/client";
import type { AthleteProfile } from "@/types/athlete";

interface ReportRow {
  id: string;
  athleteName: string;
  date: string;
  type: string;
  status: string;
  aiGenerated?: boolean;
}

export default function ReportsHubPage() {
  const [athletes, setAthletes] = useState<AthleteProfile[]>([]);
  const [selectedAthlete, setSelectedAthlete] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [lastReport, setLastReport] = useState<unknown>(null);

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
      const report = await res.json();
      setLastReport(report);
      const athlete = athletes.find((a) => a._id === selectedAthlete);
      setReports([
        {
          id: Date.now().toString(),
          athleteName: athlete?.name ?? "Athlete",
          date: new Date().toISOString().split("T")[0],
          type: "Full Digital Twin",
          status: "ready",
          aiGenerated: report.aiGenerated,
        },
        ...reports,
      ]);
      setSelectedAthlete(null);
    } catch {
      // keep UI stable
    } finally {
      setGenerating(false);
    }
  };

  const downloadJson = () => {
    if (!lastReport) return;
    const blob = new Blob([JSON.stringify(lastReport, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Stack gap="xl" pb="xl">
      <PageHeader
        title="AI Reporting Hub"
        subtitle="Reports include date range, data notes, and clearly marked AI-generated commentary."
      />

      <SectionPanel title="Generate New Report">
        <Paper withBorder p="md">
          <Group align="flex-end" grow>
            <Select
              label="Select Athlete"
              placeholder="Choose an athlete"
              data={athletes.map((a) => ({ value: a._id || "", label: a.name }))}
              value={selectedAthlete}
              onChange={setSelectedAthlete}
            />
            <Box style={{ flexGrow: 0 }}>
              <SemanticButton action="start" onClick={handleGenerate} loading={generating} disabled={!selectedAthlete}>
                Generate Report
              </SemanticButton>
            </Box>
          </Group>
        </Paper>
      </SectionPanel>

      <SectionPanel title="Recent Reports">
        <Stack gap="md">
          {reports.map((report) => (
            <Paper withBorder key={report.id} p="md">
              <Group justify="space-between">
                <Box>
                  <Text fw={700} size="md">{report.athleteName}</Text>
                  <Text size="sm" c="dimmed">
                    {report.type} • {report.date}
                    {report.aiGenerated && " • AI commentary included"}
                  </Text>
                </Box>
                <Group>
                  <StateBlock variant="success" title="Ready" />
                  <SemanticButton action="download" variant="outline" onClick={downloadJson} disabled={!lastReport}>
                    Download JSON
                  </SemanticButton>
                </Group>
              </Group>
            </Paper>
          ))}
          {reports.length === 0 && (
            <StateBlock variant="info" title="No reports yet" description="Generate your first report above." />
          )}
        </Stack>
      </SectionPanel>
    </Stack>
  );
}
