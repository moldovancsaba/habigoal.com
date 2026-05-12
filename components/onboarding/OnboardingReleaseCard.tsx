"use client";

import { Badge, Box, Button, Group, Paper, Stack, Text } from "@mantine/core";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import type { OnboardingReleasePrompt } from "@/types/onboarding";

export function OnboardingReleaseCard({
  prompt,
  onSeen
}: {
  prompt: OnboardingReleasePrompt;
  onSeen?: (version: string) => Promise<void> | void;
}) {
  const tOnboarding = useTranslations("Onboarding");
  const tNews = useTranslations("News");
  const router = useRouter();

  async function openRelease() {
    await onSeen?.(prompt.version);
    router.push(prompt.href);
  }

  async function dismissRelease() {
    await onSeen?.(prompt.version);
  }

  return (
    <Paper withBorder p="md" radius="md">
      <Stack gap="sm">
        <Group justify="space-between" align="flex-start">
          <Box>
            <Badge variant="light" color="strategy" mb="xs">
              {tOnboarding("release.badge")}
            </Badge>
            <Text fw={700}>{prompt.title}</Text>
            <Text size="sm" c="dimmed">
              {prompt.summary}
            </Text>
          </Box>
          <Text size="sm" c="dimmed">
            {prompt.publishedLabel}
          </Text>
        </Group>

        <Group justify="flex-end">
          <Button variant="default" size="sm" onClick={() => void dismissRelease()}>
            {tOnboarding("actions.dismiss")}
          </Button>
          <Button size="sm" color="ingress" onClick={() => void openRelease()}>
            {tNews("readPost")}
          </Button>
        </Group>
      </Stack>
    </Paper>
  );
}
