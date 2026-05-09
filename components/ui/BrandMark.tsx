"use client";

import { Box, Text } from "@mantine/core";

type BrandMarkProps = {
  size?: number;
  subtitle?: string;
  align?: "left" | "center";
};

export function BrandMark({ size = 88, subtitle, align = "center" }: BrandMarkProps) {
  const braceSize = Math.round(size * 0.44);
  const letterSize = Math.round(size * 0.62);

  return (
    <Box style={{ display: "inline-flex", flexDirection: "column", alignItems: align === "center" ? "center" : "flex-start", gap: 6 }}>
      <Box
        className="glass-panel surface-outline"
        px={Math.max(14, Math.round(size * 0.18))}
        py={Math.max(10, Math.round(size * 0.12))}
        style={{
          borderRadius: Math.max(18, Math.round(size * 0.22)),
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          lineHeight: 1,
          letterSpacing: "-0.06em"
        }}
      >
        <Text
          component="span"
          style={{
            fontSize: braceSize,
            fontWeight: 700,
            color: "var(--text-secondary)",
            transform: "translateY(-1px)"
          }}
        >
          {"{"}
        </Text>
        <Text
          component="span"
          style={{
            fontSize: letterSize,
            fontWeight: 900,
            color: "var(--text-primary)",
            paddingInline: Math.max(4, Math.round(size * 0.04)),
            textShadow: "0 0 24px rgba(79, 70, 229, 0.22)"
          }}
        >
          S
        </Text>
        <Text
          component="span"
          style={{
            fontSize: braceSize,
            fontWeight: 700,
            color: "var(--text-secondary)",
            transform: "translateY(-1px)"
          }}
        >
          {"}"}
        </Text>
      </Box>
      {subtitle ? (
        <Text
          size="sm"
          fw={800}
          c="var(--text-secondary)"
          style={{ letterSpacing: "0.18em", textTransform: "uppercase" }}
        >
          {subtitle}
        </Text>
      ) : null}
    </Box>
  );
}
