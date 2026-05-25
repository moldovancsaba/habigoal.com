"use client";

import { Paper, Stack, Text } from "@mantine/core";
import type { ReactNode } from "react";

type StateBlockProps = {
  title: string;
  body: string;
  action?: ReactNode;
};

export function StateBlock({ title, body, action }: StateBlockProps) {
  return (
    <Paper withBorder radius="md" p="md" role="status">
      <Stack gap="sm">
        <Text fw={700}>{title}</Text>
        <Text c="dimmed">{body}</Text>
        {action}
      </Stack>
    </Paper>
  );
}
