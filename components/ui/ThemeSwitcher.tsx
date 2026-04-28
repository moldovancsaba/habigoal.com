"use client";

import { SegmentedControl } from "@mantine/core";
import { useThemeMode } from "@/components/theme/ThemeModeContext";
import { KIDEX_COLORS } from "@/theme/tokens";

export function ThemeSwitcher() {
  const { mode, setMode } = useThemeMode();

  return (
    <SegmentedControl
      value={mode}
      onChange={(value) => value && setMode(value as "light" | "dark")}
      fullWidth
      radius="md"
      size="sm"
      color="kidex"
      data={[
        { value: "light", label: "☀️" },
        { value: "dark", label: "🌙" }
      ]}
      styles={{
        root: {
          backgroundColor: "transparent",
          border: `1px solid ${KIDEX_COLORS.navBorderMuted}`,
          padding: 2
        },
        control: {
          minHeight: 38
        },
        label: {
          color: KIDEX_COLORS.navTextMuted,
          fontSize: 18,
          lineHeight: "20px",
          paddingInline: 8
        },
        indicator: {
          backgroundColor: KIDEX_COLORS.brandTeal,
          borderRadius: 10
        }
      }}
    />
  );
}
