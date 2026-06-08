"use client";

import { Box, Stack, Text, Paper, Button, Group } from "@mantine/core";
import { PageHeader, SectionPanel } from "@doneisbetter/gds/client";
import { useState } from "react";

export default function VisionPage() {
  const [uploading, setUploading] = useState(false);

  const handleUpload = () => {
    setUploading(true);
    setTimeout(() => setUploading(false), 2000);
  };

  return (
    <Stack gap="md">
      <PageHeader title="Kinematics & Vision Lab" />
      
      <SectionPanel title="Upload Session Video">
        <Paper withBorder p="xl" radius="md" style={{ textAlign: "center", borderStyle: "dashed" }}>
          <Text size="lg" fw={500} mb="sm">Drag and drop sprint or pose videos here</Text>
          <Text size="sm" c="dimmed" mb="md">Supports MP4, MOV (Max 50MB)</Text>
          <Button loading={uploading} onClick={handleUpload} color="blue">Select File</Button>
        </Paper>
      </SectionPanel>

      <SectionPanel title="Recent Analyses">
        <Paper withBorder p="md">
          <Group justify="space-between">
            <Box>
              <Text fw={500}>Sprint Mechanics - Session A</Text>
              <Text size="sm" c="dimmed">Completed 2 hours ago</Text>
            </Box>
            <Button variant="light">View Extract</Button>
          </Group>
        </Paper>
      </SectionPanel>
    </Stack>
  );
}
