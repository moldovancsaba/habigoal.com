"use client";

import { useEffect, useState } from "react";
import { Box, Loader, Stack, Text, Paper, SimpleGrid, Group, Badge } from "@mantine/core";
import { PageHeader, SectionPanel } from "@doneisbetter/gds/client";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";

export default function AthleteIntelligencePage() {
  const [loading, setLoading] = useState(true);
  
  // Mock radar data representing Digital Twin Dimensions
  const radarData = [
    { dimension: 'Physical', value: 85, fullMark: 100 },
    { dimension: 'Performance', value: 92, fullMark: 100 },
    { dimension: 'Technical', value: 78, fullMark: 100 },
    { dimension: 'Recovery', value: 65, fullMark: 100 },
    { dimension: 'Cognitive', value: 88, fullMark: 100 },
  ];

  useEffect(() => {
    // Simulate data fetch
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  if (loading) return <Box style={{ display: "flex", justifyContent: "center", padding: "2rem" }}><Loader /></Box>;

  return (
    <Stack gap="md">
      <PageHeader title="Athlete Intelligence" />
      
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
        <SectionPanel title="Digital Twin Dimensions">
          <Box style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="dimension" />
                <PolarRadiusAxis angle={30} domain={[0, 100]} />
                <Radar name="Athlete" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
              </RadarChart>
            </ResponsiveContainer>
          </Box>
        </SectionPanel>

        <Stack gap="md">
          <SectionPanel title="Wearable Integrations">
            <Paper withBorder p="md">
              <Group justify="space-between">
                <Text fw={500}>Garmin Connect</Text>
                <Badge color="green">Synced Today</Badge>
              </Group>
            </Paper>
            <Paper withBorder p="md" mt="sm">
              <Group justify="space-between">
                <Text fw={500}>Whoop</Text>
                <Badge color="gray">Not Connected</Badge>
              </Group>
            </Paper>
          </SectionPanel>

          <SectionPanel title="AI Coaching Recommendations">
            <Paper withBorder p="md" bg="blue.0">
              <Text fw={700} c="blue.9">Development Engine</Text>
              <Text size="sm" mt="xs">
                Athlete is carrying moderate fatigue. Consider reducing volume by 15-20% and avoiding maximal eccentric loads today.
              </Text>
            </Paper>
          </SectionPanel>
        </Stack>
      </SimpleGrid>
    </Stack>
  );
}
