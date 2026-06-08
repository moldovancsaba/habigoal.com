"use client";

import { useState, useEffect } from "react";
import { Stack, Text, Paper, Group, Table, Badge, Select } from "@mantine/core";
import { PageHeader, SectionPanel, SemanticButton } from "@doneisbetter/gds/client";
import type { AthleteProfile } from "@/types/athlete";

export default function ReportsHubPage() {
  const [athletes, setAthletes] = useState<AthleteProfile[]>([]);
  const [selectedAthlete, setSelectedAthlete] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [reports, setReports] = useState([
    { id: '1', athleteName: 'John Doe', date: '2026-06-08', status: 'ready' },
    { id: '2', athleteName: 'Jane Smith', date: '2026-06-07', status: 'ready' }
  ]);

  useEffect(() => {
    fetch("/api/athletes")
      .then(res => res.json())
      .then(data => {
        setAthletes(Array.isArray(data) ? data : []);
      });
  }, []);

  const handleGenerate = () => {
    if (!selectedAthlete) return;
    setGenerating(true);
    setTimeout(() => {
      const athlete = athletes.find(a => a._id === selectedAthlete);
      if (athlete) {
        setReports([{ id: Date.now().toString(), athleteName: athlete.name, date: new Date().toISOString().split('T')[0], status: 'ready' }, ...reports]);
      }
      setGenerating(false);
      setSelectedAthlete(null);
    }, 1500);
  };

  return (
    <Stack gap="md">
      <PageHeader title="Automated Reporting Hub" />

      <SectionPanel title="Generate AI Performance Report">
        <Paper withBorder p="md">
          <Group align="flex-end">
            <Select
              label="Select Athlete"
              placeholder="Choose an athlete"
              data={athletes.map(a => ({ value: a._id || '', label: a.name }))}
              value={selectedAthlete}
              onChange={setSelectedAthlete}
              style={{ flex: 1 }}
            />
            <SemanticButton action="start" color="ingress" onClick={handleGenerate} loading={generating} disabled={!selectedAthlete} />
          </Group>
        </Paper>
      </SectionPanel>

      <SectionPanel title="Recent Reports">
        <Paper withBorder>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Athlete</Table.Th>
                <Table.Th>Date</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {reports.map((report) => (
                <Table.Tr key={report.id}>
                  <Table.Td><Text fw={500}>{report.athleteName}</Text></Table.Td>
                  <Table.Td>{report.date}</Table.Td>
                  <Table.Td><Badge color="green">Ready</Badge></Table.Td>
                  <Table.Td>
                    <SemanticButton action="download" variant="subtle" color="ingress" size="sm" />
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Paper>
      </SectionPanel>
    </Stack>
  );
}
