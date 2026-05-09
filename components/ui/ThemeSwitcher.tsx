"use client";

import { ActionIcon, Tooltip } from "@mantine/core";
import { useTranslations } from "next-intl";
import { useThemeMode } from "@/components/theme/ThemeModeContext";

export function ThemeSwitcher() {
  const { mode, setMode } = useThemeMode();
  const t = useTranslations("Common");
  const label = mode === "dark" ? t("switchToLightMode") : t("switchToDarkMode");

  return (
    <Tooltip label={label} withArrow>
      <ActionIcon
        variant="default"
        color="gray"
        size="lg"
        radius="md"
        onClick={() => setMode(mode === "light" ? "dark" : "light")}
        aria-label={label}
      >
        {mode === "dark" ? "🌙" : "☀️"}
      </ActionIcon>
    </Tooltip>
  );
}
