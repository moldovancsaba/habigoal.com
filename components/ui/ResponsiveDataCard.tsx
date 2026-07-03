"use client";

import { Box, Stack, Text } from "@mantine/core";
import { SectionPanel } from "@sovereignsquad/gds/client";
import type { ReactNode } from "react";

export function ResponsiveDataCard({ title, children, onClick }: { title: string; children: ReactNode; onClick?: () => void }) {
  return (
    <Box
      style={{ width: "100%", cursor: onClick ? "pointer" : undefined }}
      onClick={onClick}
    >
      <SectionPanel title={title}>
        <Stack gap="md">
          {children}
        </Stack>
      </SectionPanel>
    </Box>
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
