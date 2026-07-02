"use client";

import { Text } from "@mantine/core";
import { Box, Group, Stack } from "@doneisbetter/gds/client";
import { useTranslations } from "next-intl";
import type { ExplanationBundle } from "@/lib/explainability";

// Renders the input -> rule -> output explanation bundle (#254) in plain
// language, so a coach/athlete can see *why* a result was produced. Each applied
// rule shows its description and the action it yields; the rule id + version are
// exposed as a title for traceability without cluttering the UI.
export function ExplanationPanel({ bundle, title }: { bundle: ExplanationBundle; title?: string }) {
  const t = useTranslations("Explainability");
  if (!bundle.appliedRules.length) return null;

  return (
    <Stack gap="xs">
      {title ? (
        <Text size="sm" fw={700} tt="uppercase" c="dimmed">
          {title}
        </Text>
      ) : null}
      {bundle.appliedRules.map((rule) => (
        <Group
          key={rule.ruleId}
          justify="space-between"
          gap="sm"
          wrap="nowrap"
          title={`${rule.ruleId} · v${rule.ruleVersion}`}
        >
          <Text size="sm">{t(`rules.${rule.descriptionKey}`)}</Text>
          <Box style={{ flex: "0 0 auto" }}>
            <Text size="sm" fw={700}>
              {t(`outputs.${rule.outputKey}`)}
            </Text>
          </Box>
        </Group>
      ))}
    </Stack>
  );
}
