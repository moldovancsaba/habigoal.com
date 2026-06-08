"use client";

import { useEffect, useState } from "react";
import { Box, Loader, Stack, Text, SimpleGrid, Paper, Group } from "@mantine/core";
import { PageHeader, SectionPanel, SemanticButton } from "@doneisbetter/gds/client";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { AthleteProfile } from "@/types/athlete";

export default function CoachDashboardPage() {
  const tc = useTranslations("Common");

  const [athletes, setAthletes] = useState<AthleteProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/athletes")
      .then(res => res.json())
      .then(data => {
        if (!active) return;
        setAthletes(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!active) return;
        setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  if (loading) {
    return (
      <Box style={{ display: "flex", justifyContent: "center", paddingBlock: "2rem" }}>
        <Loader />
      </Box>
    );
  }

  if (error) {
    return <Text color="red">{tc("error")}</Text>;
  }

  return (
    <Stack gap="md">
      <PageHeader title="Coach Intelligence Hub" />
      
      <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
        <Paper withBorder p="md" radius="md">
          <Text size="sm" c="dimmed">Active Roster</Text>
          <Text size="xl" fw={700}>{athletes.length}</Text>
        </Paper>
        <Paper withBorder p="md" radius="md">
          <Text size="sm" c="dimmed">Team Average Readiness</Text>
          <Text size="xl" fw={700} c="green">Good</Text>
        </Paper>
        <Paper withBorder p="md" radius="md">
          <Text size="sm" c="dimmed">Action Items</Text>
          <Text size="xl" fw={700} c="red">2 Athletes Fatigued</Text>
        </Paper>
      </SimpleGrid>

      <SectionPanel title="Athlete Roster">
        <Stack gap="md">
          {athletes.map((athlete) => (
            <Paper key={athlete._id} withBorder p="md" radius="md">
              <Group justify="space-between">
                <Box>
                  <Text fw={700} size="lg">{athlete.name}</Text>
                  <Text size="sm" c="dimmed">Status: Active</Text>
                </Box>
                <Group>
                  <Link href={`/dashboard/athletes/${athlete._id}/intelligence`}>
                    <SemanticButton action="profile" variant="light" color="ingress" />
                  </Link>
                  <Link href={`/dashboard/athletes/${athlete._id}/vision`}>
                    <SemanticButton action="start" variant="outline" color="strategy" />
                  </Link>
                </Group>
              </Group>
            </Paper>
          ))}
        </Stack>
      </SectionPanel>
    </Stack>
  );
}
