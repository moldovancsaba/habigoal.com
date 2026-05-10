"use client";

import { useId } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Box, Paper, Text, useMantineTheme } from "@mantine/core";
import { ANALYTICS_CONFIG } from "./AnalyticsConstants";

interface DataPoint {
  date: string;
  value: number;
  label?: string;
}

interface LongitudinalChartProps {
  title?: string;
  data: DataPoint[];
  color?: string;
  yDomain?: [number, number];
}

export function LongitudinalChart({ 
  title, 
  data, 
  color = ANALYTICS_CONFIG.colors.primary,
  yDomain = [0, 5]
}: LongitudinalChartProps) {
  const theme = useMantineTheme();
  const gradientId = useId().replace(/[:]/g, "");

  return (
    <Paper withBorder p="md" radius="md">
      {title && (
        <Text fw={700} size="sm" mb="md">
          {title}
        </Text>
      )}
      <Box style={{ width: "100%", height: ANALYTICS_CONFIG.chartHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={ANALYTICS_CONFIG.margins}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={ANALYTICS_CONFIG.colors.grid} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: ANALYTICS_CONFIG.colors.text, fontFamily: ANALYTICS_CONFIG.fontFamily }}
              axisLine={false}
              tickLine={false}
              dy={8}
            />
            <YAxis
              domain={yDomain}
              tick={{ fontSize: 10, fill: ANALYTICS_CONFIG.colors.text, fontFamily: ANALYTICS_CONFIG.fontFamily }}
              axisLine={false}
              tickLine={false}
              width={30}
            />
            <Tooltip
              contentStyle={{
                background: "var(--surface-elevated)",
                border: "1px solid var(--border-primary)",
                borderRadius: ANALYTICS_CONFIG.tooltipRadius,
                fontFamily: ANALYTICS_CONFIG.fontFamily,
                fontSize: "12px",
                boxShadow: theme.shadows.md,
                color: "var(--text-primary)"
              }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={ANALYTICS_CONFIG.lineStrokeWidth}
              fillOpacity={1}
              fill={`url(#${gradientId})`}
              dot={{ r: ANALYTICS_CONFIG.dotRadius, fill: color, strokeWidth: 2, stroke: "var(--surface-elevated)" }}
              activeDot={{ r: ANALYTICS_CONFIG.activeDotRadius, strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </Box>
    </Paper>
  );
}
