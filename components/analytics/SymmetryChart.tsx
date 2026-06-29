"use client";

import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer, Tooltip } from "recharts";
import { Box, Paper, Text } from "@mantine/core";
import { ANALYTICS_CONFIG } from "./AnalyticsConstants";
import { ChartEmptyState } from "./ChartEmptyState";

interface SymmetryData {
  domain: string;
  value: number;
}

interface SymmetryChartProps {
  title?: string;
  data: SymmetryData[];
  emptyLabel?: string;
}

export function SymmetryChart({ title, data, emptyLabel = "No data yet" }: SymmetryChartProps) {
  return (
    <Paper withBorder p="md" radius="md">
      {title && (
        <Text fw={700} size="sm" mb="md">
          {title}
        </Text>
      )}
      {data.length === 0 ? (
        <ChartEmptyState label={emptyLabel} />
      ) : (
      <Box style={{ width: "100%", height: ANALYTICS_CONFIG.chartHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius={ANALYTICS_CONFIG.radarOuterRadius} data={data}>
            <PolarGrid stroke={ANALYTICS_CONFIG.colors.grid} />
            <PolarAngleAxis
              dataKey="domain"
              tick={{ fontSize: 11, fill: ANALYTICS_CONFIG.colors.text, fontFamily: ANALYTICS_CONFIG.fontFamily, fontWeight: 600 }}
            />
            <Tooltip
              contentStyle={{
                background: "var(--surface-elevated)",
                border: "1px solid var(--border-primary)",
                borderRadius: ANALYTICS_CONFIG.tooltipRadius,
                fontFamily: ANALYTICS_CONFIG.fontFamily,
                fontSize: "12px",
                color: "var(--text-primary)"
              }}
            />
            <Radar
              name="Score"
              dataKey="value"
              stroke={ANALYTICS_CONFIG.colors.primary}
              fill={ANALYTICS_CONFIG.colors.primary}
              fillOpacity={0.4}
              dot={{ r: 4, fill: ANALYTICS_CONFIG.colors.primary }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </Box>
      )}
    </Paper>
  );
}
