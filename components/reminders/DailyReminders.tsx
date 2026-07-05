"use client";

import { useEffect, useState } from "react";
import { Stack } from "@sovereignsquad/gds/client";
import { useTranslations } from "next-intl";
import { Paper, Text } from "@/components/gds/SurfacePrimitives";
import type { ReminderKey } from "@/types/reminder";

// Outstanding daily nudges for the signed-in athlete. Renders nothing when the
// day is complete or the user has no athlete profile, so it is safe anywhere.
export function DailyReminders() {
  const t = useTranslations("Reminders");
  const [reminders, setReminders] = useState<ReminderKey[]>([]);

  useEffect(() => {
    let active = true;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    fetch(`/api/reminders?timezone=${encodeURIComponent(timezone)}`)
      .then((res) => (res.ok ? res.json() : { reminders: [] }))
      .then((data) => {
        if (active) setReminders(Array.isArray(data.reminders) ? data.reminders : []);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  if (reminders.length === 0) return null;

  return (
    <Paper withBorder radius="md" p="md" mb="md">
      <Stack gap={6}>
        <Text fw={800}>{t("title")}</Text>
        {reminders.map((key) => (
          <Text key={key} size="sm">• {t(key)}</Text>
        ))}
      </Stack>
    </Paper>
  );
}
