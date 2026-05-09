"use client";

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
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.colors.gray[3]} />
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
                background: "var(--mantine-color-body)",
                border: "1px solid var(--mantine-color-default-border)",
                borderRadius: ANALYTICS_CONFIG.tooltipRadius,
                fontFamily: ANALYTICS_CONFIG.fontFamily,
                fontSize: "12px",
                boxShadow: theme.shadows.md
              }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={ANALYTICS_CONFIG.lineStrokeWidth}
              fillOpacity={1}
              fill="url(#colorValue)"
              dot={{ r: ANALYTICS_CONFIG.dotRadius, fill: color, strokeWidth: 2, stroke: "white" }}
              activeDot={{ r: ANALYTICS_CONFIG.activeDotRadius, strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </Box>
    </Paper>
  );
}
