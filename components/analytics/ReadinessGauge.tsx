"use client";

import { Box, Paper, Text, useMantineTheme, Group } from "@mantine/core";

interface ReadinessGaugeProps {
  value: number; // 0-6
  title?: string;
  subtitle?: string;
}

export function ReadinessGauge({ value, title, subtitle }: ReadinessGaugeProps) {
  const theme = useMantineTheme();
  
  // Normalized value for SVG (0 to 1)
  const normalizedValue = Math.min(Math.max(value / 6, 0), 1);
  
  // Gauge parameters
  const size = 180;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * Math.PI; // Semicircle
  const offset = circumference - normalizedValue * circumference;

  // Determine color based on readiness
  const getColor = () => {
    if (value < 3) return theme.colors.red[6];
    if (value < 4) return theme.colors.yellow[6];
    return theme.colors.kidex[6];
  };

  const gaugeColor = getColor();

  return (
    <Paper withBorder p="md" radius="md" style={{ textAlign: "center" }}>
      {title && (
        <Text fw={700} size="sm" mb="xs">
          {title}
        </Text>
      )}
      
      <Box style={{ position: "relative", width: size, height: size / 2 + 20, margin: "0 auto" }}>
        <svg width={size} height={size / 2 + 10} style={{ transform: "rotate(180deg)" }}>
          {/* Background Track */}
          <circle
            cx={size / 2}
            cy={10}
            r={radius}
            fill="none"
            stroke={theme.colors.gray[2]}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeLinecap="round"
          />
          {/* Active Value Path */}
          <circle
            cx={size / 2}
            cy={10}
            r={radius}
            fill="none"
            stroke={gaugeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.8s ease-in-out, stroke 0.5s ease" }}
          />
        </svg>
        
        {/* Value Display */}
        <Box style={{ position: "absolute", bottom: 10, left: 0, right: 0 }}>
          <Text size="xl" fw={800} style={{ lineHeight: 1 }}>
            {value.toFixed(1)}
          </Text>
          {subtitle && (
            <Text size="sm" c="dimmed" mt={2}>
              {subtitle}
            </Text>
          )}
        </Box>
      </Box>

      <Group justify="space-between" mt="xs" px="md">
        <Text size="sm" c="dimmed">0.0</Text>
        <Text size="sm" c="dimmed">6.0</Text>
      </Group>
    </Paper>
  );
}
