"use client";

import { Line, LineChart, ResponsiveContainer } from "recharts";
import { Box } from "@sovereignsquad/gds/client";
import { ANALYTICS_CONFIG } from "./AnalyticsConstants";

interface SparklineChartProps {
  data: number[];
  width?: number | string;
  height?: number;
  color?: string;
}

export function SparklineChart({ 
  data, 
  width = 80, 
  height = 30, 
  color = ANALYTICS_CONFIG.colors.primary
}: SparklineChartProps) {
  
  // Recharts expects objects
  const chartData = data.map((v, i) => ({ v, i }));

  return (
    <Box style={{ width, height, display: "inline-block", verticalAlign: "middle" }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <Line
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={2}
            dot={false}
            activeDot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
}
