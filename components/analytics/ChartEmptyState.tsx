"use client";

import { Box, Text } from "@mantine/core";
import { ANALYTICS_CONFIG } from "./AnalyticsConstants";

// Shared empty state for analytics charts (GH-339): a new athlete with no history
// must see clear guidance, not a blank chart frame. Announced to assistive tech
// via role="status" and sized to the chart so layout does not jump.
export function ChartEmptyState({ label }: { label: string }) {
  return (
    <Box
      role="status"
      style={{
        width: "100%",
        height: ANALYTICS_CONFIG.chartHeight,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        paddingInline: "var(--mantine-spacing-md)"
      }}
    >
      <Text size="sm" c="dimmed">
        {label}
      </Text>
    </Box>
  );
}
