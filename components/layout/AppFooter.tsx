"use client";

import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { APP_VERSION } from "@/lib/app-version";
import { DEFAULT_KIDEX_SETTINGS, getSettings, type KidexSettings } from "@/services/settings-service";

export function AppFooter() {
  const t = useTranslations("Dashboard");
  const [settings, setSettings] = useState<KidexSettings>(DEFAULT_KIDEX_SETTINGS);

  useEffect(() => {
    void getSettings().then(setSettings).catch(() => null);
  }, []);

  return (
    <Box component="footer" className="no-print" sx={{ mt: 4, px: { xs: 2, sm: 3 }, pb: { xs: 1, sm: 2 } }}>
      <Divider sx={{ mb: 1.5 }} />
      <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} sx={{ justifyContent: "space-between", alignItems: { md: "center" } }}>
        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
          <Typography component={Link} href="/dashboard/legal/gtc" variant="body2" sx={{ textDecoration: "none", color: "text.secondary", "&:hover": { color: "text.primary" } }}>
            {t("gtc")}
          </Typography>
          <Typography variant="body2" color="text.disabled">
            |
          </Typography>
          <Typography component={Link} href="/dashboard/legal/privacy" variant="body2" sx={{ textDecoration: "none", color: "text.secondary", "&:hover": { color: "text.primary" } }}>
            {t("privacyPolicy")}
          </Typography>
        </Stack>

        <Typography variant="body2" color="text.secondary">
          {settings.company.name} · v{APP_VERSION}
        </Typography>
      </Stack>
    </Box>
  );
}
