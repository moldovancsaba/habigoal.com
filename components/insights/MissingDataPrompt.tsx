"use client";

import { Group, Text } from "@mantine/core";
import { SemanticButton } from "@doneisbetter/gds/client";

// Inline "this is empty — add it yourself" affordance (#missing-data, req 5).
// Used wherever the data model has a field but no value yet (e.g. a lite module
// with no entries, a cognitive trait with no score), so the athlete can fill it in
// right where the gap is shown instead of hunting for a form.
export function MissingDataPrompt({
  message,
  actionLabel,
  onAdd,
}: {
  message: string;
  actionLabel: string;
  onAdd: () => void;
}) {
  return (
    <Group justify="space-between" gap="sm" wrap="wrap">
      <Text size="sm" c="dimmed">
        {message}
      </Text>
      <SemanticButton action="start" size="sm" variant="light" onClick={onAdd}>
        {actionLabel}
      </SemanticButton>
    </Group>
  );
}
