"use client";

import { useState } from "react";
import { Box, Stack, Text, Paper, Slider, Group, NumberInput } from "@mantine/core";
import { PageHeader, SectionPanel, SemanticButton } from "@doneisbetter/gds/client";

export default function RpeLoggerPage() {
  const [rpe, setRpe] = useState<number>(5);
  const [duration, setDuration] = useState<number | string>(60);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    setSaving(true);
    // Real implementation would POST to /api/session-plans/rpe
    setTimeout(() => {
      setSaving(false);
      setSuccess(true);
    }, 1000);
  };

  if (success) {
    return (
      <Box p="xl" style={{ textAlign: "center" }}>
        <Text size="xl" fw={700} c="var(--mantine-color-tactical-6)">Session Logged!</Text>
        <Text mt="sm">Your load points have been updated.</Text>
      </Box>
    );
  }

  return (
    <Stack gap="md" p="md">
      <PageHeader title="Log Training Session" />
      
      <SectionPanel title="Post-Session RPE">
        <Stack gap="xl">
          <Box>
            <Text fw={500} mb="xs">Rating of Perceived Exertion (1-10)</Text>
            <Text size="sm" c="dimmed" mb="md">How hard was the session?</Text>
            <Slider
              value={rpe}
              onChange={setRpe}
              min={1}
              max={10}
              step={1}
              marks={[
                { value: 1, label: 'Very Light' },
                { value: 5, label: 'Hard' },
                { value: 10, label: 'Maximal' }
              ]}
              mb="xl"
            />
          </Box>

          <NumberInput 
            label="Duration (minutes)" 
            value={duration} 
            onChange={setDuration} 
            min={1} 
            max={300} 
          />

          <Paper withBorder p="md" bg="gray.0">
            <Group justify="space-between">
              <Text fw={500}>Calculated Load:</Text>
              <Text fw={700} size="lg" c="var(--mantine-color-ingress-7)">{rpe * Number(duration)} Points</Text>
            </Group>
          </Paper>

          <SemanticButton action="save" color="ingress" onClick={handleSubmit} loading={saving} fullWidth />
        </Stack>
      </SectionPanel>
    </Stack>
  );
}
