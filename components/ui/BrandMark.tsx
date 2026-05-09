"use client";

import Image from "next/image";
import { Box, Text } from "@mantine/core";
import { Link } from "@/i18n/navigation";

type BrandMarkProps = {
  size?: number;
  subtitle?: string;
  align?: "left" | "center";
};

export function BrandMark({ size = 88, subtitle, align = "center" }: BrandMarkProps) {
  const iconSize = Math.round(size);
  const subtitleAlign = align === "center" ? "center" : "left";

  return (
    <Link href="/" aria-label="Go to home" style={{ display: "inline-flex", textDecoration: "none" }}>
      <Box style={{ display: "inline-flex", flexDirection: "column", alignItems: align === "center" ? "center" : "flex-start", gap: 6 }}>
        <Box
          className="glass-panel surface-outline"
          p={Math.max(10, Math.round(size * 0.1))}
          style={{
            borderRadius: Math.max(18, Math.round(size * 0.22)),
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            lineHeight: 1
          }}
        >
          <Image
            src="/images/habigoal.png"
            alt="Habigoal"
            width={iconSize}
            height={iconSize}
            priority={size >= 140}
            style={{
              width: iconSize,
              height: iconSize,
              display: "block"
            }}
          />
        </Box>
        {subtitle ? (
          <Text
            size="sm"
            fw={800}
            c="var(--text-secondary)"
            ta={subtitleAlign}
            style={{ letterSpacing: "0.18em", textTransform: "uppercase" }}
          >
            {subtitle}
          </Text>
        ) : null}
      </Box>
    </Link>
  );
}
