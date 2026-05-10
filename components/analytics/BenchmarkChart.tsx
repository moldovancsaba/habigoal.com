"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Box, Paper, Text } from "@mantine/core";
import { ANALYTICS_CONFIG } from "./AnalyticsConstants";

interface BenchmarkData {
  subject: string;
  individual: number;
  average: number;
}

interface BenchmarkChartProps {
  title?: string;
  data: BenchmarkData[];
  labels?: {
    individual: string;
    average: string;
  };
}

export function BenchmarkChart({ 
  title, 
  data,
  labels = { individual: "Individual", average: "Age Group Avg" }
}: BenchmarkChartProps) {
  return (
    <Paper withBorder p="md" radius="md">
      {title && (
        <Text fw={700} size="sm" mb="md">
          {title}
        </Text>
      )}
      <Box style={{ width: "100%", height: ANALYTICS_CONFIG.chartHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={ANALYTICS_CONFIG.margins} barGap={8}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={ANALYTICS_CONFIG.colors.grid} />
            <XAxis
              dataKey="subject"
              tick={{ fontSize: 10, fill: ANALYTICS_CONFIG.colors.text, fontFamily: ANALYTICS_CONFIG.fontFamily }}
              axisLine={false}
              tickLine={false}
              dy={8}
            />
            <YAxis
              domain={[0, 5]}
              tick={{ fontSize: 10, fill: ANALYTICS_CONFIG.colors.text, fontFamily: ANALYTICS_CONFIG.fontFamily }}
              axisLine={false}
              tickLine={false}
              width={30}
            />
            <Tooltip
              cursor={{ fill: "rgba(0, 174, 239, 0.08)" }}
              contentStyle={{
                background: "var(--surface-elevated)",
                border: "1px solid var(--border-primary)",
                borderRadius: ANALYTICS_CONFIG.tooltipRadius,
                fontFamily: ANALYTICS_CONFIG.fontFamily,
                fontSize: "12px",
                color: "var(--text-primary)"
              }}
            />
            <Legend 
              verticalAlign="top" 
              align="right" 
              iconType="circle"
              wrapperStyle={{ 
                paddingBottom: "20px", 
                fontSize: "10px", 
                fontFamily: ANALYTICS_CONFIG.fontFamily 
              }} 
            />
            <Bar
              name={labels.individual}
              dataKey="individual"
              fill={ANALYTICS_CONFIG.colors.primary}
              radius={[4, 4, 0, 0]}
              barSize={20}
            />
            <Bar
              name={labels.average}
              dataKey="average"
              fill={ANALYTICS_CONFIG.colors.secondary}
              radius={[4, 4, 0, 0]}
              barSize={20}
            />
          </BarChart>
        </ResponsiveContainer>
      </Box>
    </Paper>
  );
}
