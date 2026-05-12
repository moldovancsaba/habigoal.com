"use client";

import { Box, Button, Group, Paper, Stack, Text } from "@mantine/core";
import { useMessages, useTranslations } from "next-intl";
import { resolveOnboardingStep } from "@/lib/onboarding/copy";
import type { OnboardingModuleDefinition } from "@/types/onboarding";

export function OnboardingModuleCard({
  module,
  onDismiss
}: {
  module: OnboardingModuleDefinition;
  onDismiss?: (moduleId: string) => void;
}) {
  const t = useTranslations("Onboarding");
  const messages = useMessages();

  return (
    <Paper withBorder p="md" radius="md">
      <Stack gap="sm">
        <Box>
          <Text fw={700}>
            {module.steps[0]
              ? resolveOnboardingStep(t, messages.Onboarding, module, module.steps[0], "title", t("defaults.moduleTitle"))
              : t("defaults.moduleTitle")}
          </Text>
          <Text size="sm" c="dimmed">
            {module.steps[0]
              ? resolveOnboardingStep(t, messages.Onboarding, module, module.steps[0], "body", t("defaults.moduleBody"))
              : t("defaults.moduleBody")}
          </Text>
        </Box>

        {module.steps.length > 1 ? (
          <Stack gap={8}>
            {module.steps.slice(1).map((step) => (
              <Box key={step.id}>
                <Text size="sm" fw={600}>{resolveOnboardingStep(t, messages.Onboarding, module, step, "title", t("defaults.moduleTitle"))}</Text>
                <Text size="sm" c="dimmed">{resolveOnboardingStep(t, messages.Onboarding, module, step, "body", t("defaults.moduleBody"))}</Text>
              </Box>
            ))}
          </Stack>
        ) : null}

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
