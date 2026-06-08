"use client";

import { useState } from "react";
import { Box, Stack, Text, Paper, SimpleGrid, Group, Badge, Select, TextInput, NumberInput } from "@mantine/core";
import { PageHeader, SectionPanel, SemanticButton } from "@doneisbetter/gds/client";
import { useTranslations } from "next-intl";

export default function SessionPlannerPage() {
  const t = useTranslations("Dashboard");
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState([
    { id: '1', title: 'Strength Block A', category: 'strength', date: '2026-06-08', loadPoints: 400 },
    { id: '2', title: 'Match Prep', category: 'tactical', date: '2026-06-09', loadPoints: 250 }
  ]);

  const [draftTitle, setDraftTitle] = useState("");
  const [draftCategory, setDraftCategory] = useState<string | null>("tactical");
  const [draftLoad, setDraftLoad] = useState<number | string>(300);

  const handleCreate = () => {
    setLoading(true);
    setTimeout(() => {
      setSessions([...sessions, { id: Date.now().toString(), title: draftTitle || "New Session", category: draftCategory || "tactical", date: '2026-06-10', loadPoints: Number(draftLoad) }]);
      setDraftTitle("");
      setLoading(false);
    }, 500);
  };

  return (
    <Stack gap="md">
      <PageHeader title="Session Planner & Microcycles" />
      
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
        <SectionPanel title="Create New Session">
          <Stack gap="md">
            <TextInput label="Session Title" value={draftTitle} onChange={(e) => setDraftTitle(e.currentTarget.value)} placeholder="e.g. Strength Block A" />
            <Select 
              label="Category" 
              data={['strength', 'tactical', 'endurance', 'speed', 'recovery', 'match']} 
              value={draftCategory} 
              onChange={setDraftCategory} 
            />
            <NumberInput label="Planned Load Points" value={draftLoad} onChange={setDraftLoad} />
            <Group justify="flex-end">
              <SemanticButton action="save" color="ingress" onClick={handleCreate} loading={loading} disabled={!draftTitle} />
            </Group>
          </Stack>
        </SectionPanel>

        <SectionPanel title="Upcoming Microcycle">
          <Stack gap="md">
            {sessions.map(session => (
              <Paper key={session.id} withBorder p="md" radius="md">
                <Group justify="space-between">
                  <Box>
                    <Text fw={700}>{session.title}</Text>
                    <Text size="sm" c="dimmed">Date: {session.date}</Text>
                  </Box>
                  <Group>
                    <Badge color="blue" variant="light">{session.category}</Badge>
                    <Badge color="gray" variant="filled">{session.loadPoints} Pts</Badge>
                  </Group>
                </Group>
              </Paper>
            ))}
          </Stack>
        </SectionPanel>
      </SimpleGrid>
    </Stack>
  );
}
