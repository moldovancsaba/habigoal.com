"use client";

import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Tooltip from "@mui/material/Tooltip";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useLocale } from "next-intl";

export function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  function switchLocale(nextLocale: "en" | "hu" | "ar") {
    const cleanPath = pathname.replace(/^\/(en|hu|ar)(\/|$)/, "/");
    router.replace(cleanPath, { locale: nextLocale });
  }

  return (
    <ToggleButtonGroup
      exclusive
      value={locale}
      onChange={(_, value) => value && switchLocale(value)}
      size="small"
      fullWidth
      sx={{
        "& .MuiToggleButton-root": {
          color: "rgba(255,255,255,0.75)",
          borderColor: "rgba(255,255,255,0.25)",
          py: 0.6,
          minWidth: 0
        },
        "& .MuiToggleButton-root.Mui-selected": {
          bgcolor: "secondary.main",
          color: "common.white",
          borderColor: "secondary.main",
          "&:hover": { bgcolor: "secondary.dark" }
        }
      }}
    >
      <Tooltip title="Arabic" arrow>
        <ToggleButton value="ar" aria-label="Switch to Arabic">
          <span role="img" aria-hidden="true">🇸🇦</span>
        </ToggleButton>
      </Tooltip>
      <Tooltip title="Hungarian" arrow>
        <ToggleButton value="hu" aria-label="Switch to Hungarian">
          <span role="img" aria-hidden="true">🇭🇺</span>
        </ToggleButton>
      </Tooltip>
      <Tooltip title="English" arrow>
        <ToggleButton value="en" aria-label="Switch to English">
          <span role="img" aria-hidden="true">🇬🇧</span>
        </ToggleButton>
      </Tooltip>
    </ToggleButtonGroup>
  );
}
