"use client";

import { ActionIcon, Tooltip } from "@mantine/core";
import { useThemeMode } from "@/components/theme/ThemeModeContext";

export function ThemeSwitcher() {
  const { mode, setMode } = useThemeMode();

  return (
    <Tooltip label={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"} withArrow>
      <ActionIcon
        variant="subtle"
        color="gray"
        onClick={() => setMode(mode === "light" ? "dark" : "light")}
        aria-label={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      >
        {mode === "dark" ? "🌙" : "☀️"}
      </ActionIcon>
    </Tooltip>
  );
}
