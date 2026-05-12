"use client";

import { Badge, Box, Button, Group, Paper, Stack, Text } from "@mantine/core";
import type { OnboardingChecklistProgress, OnboardingModuleDefinition } from "@/types/onboarding";

export function OnboardingChecklistCard({
  module,
  progress,
  onDismiss
}: {
  module: OnboardingModuleDefinition;
  progress: OnboardingChecklistProgress;
  onDismiss?: (moduleId: string) => void;
}) {
  const completedSteps = progress[module.id] ?? [];

  return (
    <Paper withBorder p="md" radius="md">
      <Stack gap="sm">
        <Group justify="space-between" align="flex-start">
          <Box>
            <Text fw={700}>{module.steps[0]?.title || "Onboarding checklist"}</Text>
            <Text size="sm" c="dimmed">
              {module.steps[0]?.body || "Follow these steps to get started."}
            </Text>
          </Box>
          <Badge variant="light">{`${completedSteps.length}/${module.steps.length}`}</Badge>
        </Group>

        <Stack gap={8}>
          {module.steps.map((step) => {
            const done = completedSteps.includes(step.id);
            return (
              <Group key={step.id} gap="sm" wrap="nowrap" align="flex-start">
                <Badge color={done ? "green" : "gray"} variant={done ? "filled" : "light"}>
                  {done ? "Done" : "Next"}
                </Badge>
                <Box>
                  <Text size="sm" fw={600}>{step.title}</Text>
                  <Text size="sm" c="dimmed">{step.body}</Text>
                </Box>
              </Group>
            );
          })}
        </Stack>

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
