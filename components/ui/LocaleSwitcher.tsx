"use client";

import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useLocale } from "next-intl";

export function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  function switchLocale(nextLocale: "en" | "hu") {
    const cleanPath = pathname.replace(/^\/(en|hu)(\/|$)/, "/");
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
          py: 0.75,
          fontWeight: 700,
          fontSize: "0.75rem"
        },
        "& .MuiToggleButton-root.Mui-selected": {
          bgcolor: "secondary.main",
          color: "common.white",
          borderColor: "secondary.main",
          "&:hover": { bgcolor: "secondary.dark" }
        }
      }}
    >
      <ToggleButton value="hu">HU</ToggleButton>
      <ToggleButton value="en">EN</ToggleButton>
    </ToggleButtonGroup>
  );
}
