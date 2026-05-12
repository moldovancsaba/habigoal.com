"use client";

import { Badge, Box, Button, Group, Paper, Stack, Text } from "@mantine/core";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("Onboarding");
  const completedSteps = progress[module.id] ?? [];

  return (
    <Paper withBorder p="md" radius="md">
      <Stack gap="sm">
        <Group justify="space-between" align="flex-start">
          <Box>
            <Text fw={700}>{module.steps[0]?.title || t("defaults.checklistTitle")}</Text>
            <Text size="sm" c="dimmed">
              {module.steps[0]?.body || t("defaults.checklistBody")}
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
                  {done ? t("status.done") : t("status.next")}
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
              {t("actions.dismiss")}
            </Button>
          </Group>
        ) : null}
      </Stack>
    </Paper>
  );
}
