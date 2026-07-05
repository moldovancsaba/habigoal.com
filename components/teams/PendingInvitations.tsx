"use client";

import { useEffect, useState } from "react";
import { Button, Group, Stack } from "@sovereignsquad/gds/client";
import { useTranslations } from "next-intl";
import { Paper, Text } from "@/components/gds/SurfacePrimitives";
import { getProductColor } from "@/lib/product-ui-contracts";
import type { TeamInvitation } from "@/types/team-invitation";

// Shows the signed-in user's pending team invitations and lets them accept.
// Renders nothing when there are none, so it is safe to mount on any shell.
export function PendingInvitations() {
  const t = useTranslations("TeamInvitations");
  const [invites, setInvites] = useState<TeamInvitation[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/invitations")
      .then((res) => (res.ok ? res.json() : { invitations: [] }))
      .then((data) => {
        if (active) setInvites(Array.isArray(data.invitations) ? data.invitations : []);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  async function accept(invite: TeamInvitation) {
    setBusy(invite._id ?? null);
    setError(null);
    const res = await fetch(`/api/invitations/${invite._id}`, { method: "POST" }).catch(() => null);
    if (res && res.ok) {
      setInvites((current) => current.filter((item) => item._id !== invite._id));
    } else {
      const data = res ? await res.json().catch(() => null) : null;
      setError(data?.code === "ATHLETE_PROFILE_REQUIRED" ? t("athleteProfileRequired") : t("error"));
    }
    setBusy(null);
  }

  if (invites.length === 0) return null;

  return (
    <Paper withBorder radius="md" p="md" mb="md">
      <Stack gap="sm">
        <Text fw={800}>{t("pendingTitle")}</Text>
        {error ? <Text size="sm" c="red">{error}</Text> : null}
        {invites.map((invite) => (
          <Group key={invite._id} justify="space-between" wrap="nowrap" gap="sm">
            <Text>{invite.teamName} · {t(invite.role === "trainer" ? "roleTrainer" : "roleAthlete")}</Text>
            <Button color={getProductColor("dashboard", "primaryAction")} size="sm" loading={busy === invite._id} onClick={() => void accept(invite)}>
              {busy === invite._id ? t("accepting") : t("accept")}
            </Button>
          </Group>
        ))}
      </Stack>
    </Paper>
  );
}
