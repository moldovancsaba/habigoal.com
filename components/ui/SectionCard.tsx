"use client";

import { Box, Group, Paper, Stack, Text } from "@mantine/core";
import type { CSSProperties, ReactNode } from "react";

type SectionCardProps = {
  title?: string;
  subheader?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  sx?: Record<string, unknown>;
  contentSx?: Record<string, unknown>;
};

function toStyleObject(input?: Record<string, unknown>, withDefaultMargin = false): CSSProperties {
  if (!input) {
    return withDefaultMargin ? { marginBottom: "1rem" } : {};
  }

  const { mb, ...rest } = input;
  const style = rest as CSSProperties;
  if (typeof mb === "number") {
    style.marginBottom = `${mb * 0.25}rem`;
  } else if (typeof mb === "string") {
    style.marginBottom = mb;
  } else if (withDefaultMargin) {
    style.marginBottom = "1rem";
  }
  return style;
}

export function SectionCard({ title, subheader, action, children, className, sx, contentSx }: SectionCardProps) {
  return (
    <Paper withBorder radius="md" className={`surface-outline ${className ?? ""}`.trim()} style={toStyleObject(sx, true)}>
      {(title || action) ? (
        <Group justify="space-between" align="flex-start" wrap="wrap" px="md" pt="md" pb={0}>
          <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
            {title ? <Text fw={600}>{title}</Text> : null}
            {subheader ? <Text size="sm" c="var(--text-secondary)" style={{ lineHeight: 1.45 }}>{subheader}</Text> : null}
          </Stack>
          {action ? <Box style={{ width: "100%", minWidth: 0 }}>{action}</Box> : null}
        </Group>
      ) : null}
      <Box p={{ base: "md", sm: "md" }} style={toStyleObject(contentSx)}>
        {children}
      </Box>
    </Paper>
  );
}
