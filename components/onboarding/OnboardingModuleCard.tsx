"use client";

import { Box, Button, Group, Paper, Stack, Text } from "@mantine/core";
import type { OnboardingModuleDefinition } from "@/types/onboarding";

export function OnboardingModuleCard({
  module,
  onDismiss
}: {
  module: OnboardingModuleDefinition;
  onDismiss?: (moduleId: string) => void;
}) {
  return (
    <Paper withBorder p="md" radius="md">
      <Stack gap="sm">
        <Box>
          <Text fw={700}>{module.steps[0]?.title || "Getting started"}</Text>
          <Text size="sm" c="dimmed">
            {module.steps[0]?.body || "This surface has a short onboarding introduction."}
          </Text>
        </Box>

        {module.steps.length > 1 ? (
          <Stack gap={8}>
            {module.steps.slice(1).map((step) => (
              <Box key={step.id}>
                <Text size="sm" fw={600}>{step.title}</Text>
                <Text size="sm" c="dimmed">{step.body}</Text>
              </Box>
            ))}
          </Stack>
        ) : null}

        {module.dismissible && onDismiss ? (
          <Group justify="flex-end">
            <Button variant="default" size="sm" onClick={() => onDismiss(module.id)}>
              Dismiss
            </Button>
          </Group>
        ) : null}
      </Stack>
    </Paper>
  );
}
