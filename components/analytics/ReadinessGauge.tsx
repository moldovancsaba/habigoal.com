"use client";

import { Box, Paper, Text, Group } from "@mantine/core";

interface ReadinessGaugeProps {
  value: number;
  max?: number;
  title?: string;
  subtitle?: string;
}

export function ReadinessGauge({ value, max = 5, title, subtitle }: ReadinessGaugeProps) {
  // Normalize the score into the SVG stroke range.
  const normalizedValue = Math.min(Math.max(value / max, 0), 1);
  
  // Semicircle gauge geometry.
  const size = 180;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * Math.PI; // Semicircle
  const offset = circumference - normalizedValue * circumference;

  // Color thresholds mirror the app readiness bands.
  const getColor = () => {
    const ratio = max > 0 ? value / max : 0;
    if (ratio < 0.45) return "var(--status-error)";
    if (ratio < 0.72) return "var(--accent-gold)";
    return "var(--mantine-color-knowmore-6)";
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
          {/* Background track */}
          <circle
            cx={size / 2}
            cy={10}
            r={radius}
            fill="none"
            stroke="var(--border-primary)"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeLinecap="round"
          />
          {/* Active value path */}
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
        
        {/* Value display */}
        <Box style={{ position: "absolute", bottom: 10, left: 0, right: 0 }}>
          <Text size="xl" fw={800} style={{ lineHeight: 1 }}>
            {value.toFixed(1)}
          </Text>
          {subtitle && (
            <Text size="sm" c="var(--text-secondary)" mt={2}>
              {subtitle}
            </Text>
          )}
        </Box>
      </Box>

      <Group justify="space-between" mt="xs" px="md">
        <Text size="sm" c="var(--text-secondary)">0.0</Text>
        <Text size="sm" c="var(--text-secondary)">{max.toFixed(1)}</Text>
      </Group>
    </Paper>
  );
}
