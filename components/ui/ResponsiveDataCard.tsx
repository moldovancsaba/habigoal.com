"use client";

import { Box, Paper, Stack, Text } from "@mantine/core";
import type { ReactNode } from "react";

export function ResponsiveDataCard({ title, children, onClick }: { title: string; children: ReactNode; onClick?: () => void }) {
  return (
    <Paper
      withBorder
      p="md"
      radius="md"
      style={{ width: "100%", cursor: onClick ? "pointer" : undefined }}
      onClick={onClick}
    >
      <Text fw={700} size="xl" mb="md">
        {title}
      </Text>
      <Stack gap="md">
        {children}
      </Stack>
    </Paper>
  );
}

export function ResponsiveDataRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Stack gap={4}>
      <Text
        size="sm"
        fw={700}
        c="var(--text-secondary)"
        style={{ textTransform: "uppercase", letterSpacing: "0.04em", lineHeight: 1.35 }}
      >
        {label}
      </Text>
      <Box style={{ width: "100%", minWidth: 0 }}>
        {typeof value === "string" || typeof value === "number" ? (
          <Text size="lg" fw={500} style={{ overflowWrap: "anywhere" }}>
            {value}
          </Text>
        ) : (
          value
        )}
      </Box>
    </Stack>
  );
}
