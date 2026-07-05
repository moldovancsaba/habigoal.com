"use client";

import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Box } from "@sovereignsquad/gds/client";
import { Paper, Text } from "@/components/gds/SurfacePrimitives";
import { ANALYTICS_CONFIG } from "./AnalyticsConstants";
import { ChartEmptyState } from "./ChartEmptyState";

interface RadarPoint {
  subject: string;
  A: number;
  B?: number;
  fullMark: number;
}

interface MaturityRadarChartProps {
  title?: string;
  data: RadarPoint[];
  labels?: {
    A: string;
    B?: string;
  };
  emptyLabel?: string;
}

export function MaturityRadarChart({
  title,
  data,
  labels = { A: "Current" },
  emptyLabel = "No data yet"
}: MaturityRadarChartProps) {
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
              dataKey="subject"
              tick={{ fontSize: 10, fill: ANALYTICS_CONFIG.colors.text, fontFamily: ANALYTICS_CONFIG.fontFamily }}
            />
            <PolarRadiusAxis
              angle={30}
              domain={[0, 5]}
              tick={{ fontSize: 8, fill: ANALYTICS_CONFIG.colors.dimmed }}
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
            {labels.B && (
              <Legend 
                verticalAlign="bottom" 
                align="center" 
                iconType="circle"
                wrapperStyle={{ 
                  paddingTop: "10px", 
                  fontSize: "10px", 
                  fontFamily: ANALYTICS_CONFIG.fontFamily 
                }} 
              />
            )}
            <Radar
              name={labels.A}
              dataKey="A"
              stroke={ANALYTICS_CONFIG.colors.primary}
              fill={ANALYTICS_CONFIG.colors.primary}
              fillOpacity={0.6}
            />
            {labels.B && (
              <Radar
                name={labels.B}
                dataKey="B"
                stroke={ANALYTICS_CONFIG.colors.secondary}
                fill={ANALYTICS_CONFIG.colors.secondary}
                fillOpacity={0.22}
              />
            )}
          </RadarChart>
        </ResponsiveContainer>
      </Box>
      )}
    </Paper>
  );
}
