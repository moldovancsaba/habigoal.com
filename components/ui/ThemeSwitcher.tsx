"use client";

import DarkModeOutlined from "@mui/icons-material/DarkModeOutlined";
import LightModeOutlined from "@mui/icons-material/LightModeOutlined";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import { useThemeMode } from "@/components/theme/ThemeModeContext";

export function ThemeSwitcher() {
  const { mode, setMode } = useThemeMode();

  return (
    <ToggleButtonGroup
      exclusive
      value={mode}
      onChange={(_, value) => value && setMode(value)}
      size="small"
      fullWidth
      sx={{
        "& .MuiToggleButton-root": {
          color: "rgba(255,255,255,0.75)",
          borderColor: "rgba(255,255,255,0.25)",
          py: 0.75
        },
        "& .MuiToggleButton-root.Mui-selected": {
          bgcolor: "secondary.main",
          color: "common.white",
          borderColor: "secondary.main",
          "&:hover": { bgcolor: "secondary.dark" }
        }
      }}
    >
      <ToggleButton value="light" aria-label="light mode">
        <LightModeOutlined fontSize="small" sx={{ mr: 0.5 }} />
      </ToggleButton>
      <ToggleButton value="dark" aria-label="dark mode">
        <DarkModeOutlined fontSize="small" sx={{ mr: 0.5 }} />
      </ToggleButton>
    </ToggleButtonGroup>
  );
}
