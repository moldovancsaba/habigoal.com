"use client";

import { useEffect, useState } from "react";
import { Button, Group, Paper, Select, Stack, Text, TextInput } from "@mantine/core";
import { useTranslations } from "next-intl";
import type { Team } from "@/types/team";
import type { TeamInvitation } from "@/types/team-invitation";

// Lets a trainer/admin invite an athlete or trainer to a team they manage and
// revoke pending invitations. Self-contained: fetches its own pending list.
export function TeamInvitationsManager({ teams }: { teams: Team[] }) {
  const t = useTranslations("TeamInvitations");
  const manageable = teams.filter((team) => team._id);
  const [teamId, setTeamId] = useState<string | null>(manageable[0]?._id ?? null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"athlete" | "trainer">("athlete");
  const [pending, setPending] = useState<TeamInvitation[]>([]);
  const [refresh, setRefresh] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!teamId) return;
    let active = true;
    fetch(`/api/teams/${teamId}/invitations`)
      .then((res) => (res.ok ? res.json() : { invitations: [] }))
      .then((data) => {
        if (active) {
          const list = Array.isArray(data.invitations) ? data.invitations : [];
          setPending(list.filter((item: TeamInvitation) => item.status === "pending"));
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [teamId, refresh]);

  async function send() {
    if (!teamId || !email.trim()) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    const res = await fetch(`/api/teams/${teamId}/invitations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), role })
    }).catch(() => null);
    if (res && res.ok) {
      setEmail("");
      setMessage(t("sent"));
      setRefresh((value) => value + 1);
    } else {
      setError(t("error"));
    }
    setBusy(false);
  }

  async function revoke(invite: TeamInvitation) {
    const res = await fetch(`/api/invitations/${invite._id}`, { method: "DELETE" }).catch(() => null);
    if (res && res.ok) setPending((current) => current.filter((item) => item._id !== invite._id));
  }

  if (manageable.length === 0) return null;

  return (
    <Paper withBorder radius="md" p="md">
      <Stack gap="sm">
        <Text fw={800}>{t("inviteHeading")}</Text>
        <Select
          label={t("teamLabel")}
          data={manageable.map((team) => ({ value: team._id as string, label: team.name }))}
          value={teamId}
          onChange={setTeamId}
          allowDeselect={false}
        />
        <TextInput label={t("emailLabel")} placeholder={t("emailPlaceholder")} type="email" value={email} onChange={(event) => setEmail(event.currentTarget.value)} />
        <Select
          label={t("roleLabel")}
          data={[{ value: "athlete", label: t("roleAthlete") }, { value: "trainer", label: t("roleTrainer") }]}
          value={role}
          onChange={(value) => setRole(value === "trainer" ? "trainer" : "athlete")}
          allowDeselect={false}
        />
        {message ? <Text size="sm" c="var(--mantine-color-ingress-7)">{message}</Text> : null}
        {error ? <Text size="sm" c="red">{error}</Text> : null}
        <Group>
          <Button loading={busy} disabled={!teamId || !email.trim()} onClick={() => void send()}>
            {busy ? t("sending") : t("send")}
          </Button>
        </Group>
        <Stack gap={6}>
          <Text fw={700} size="sm">{t("pendingForTeam")}</Text>
          {pending.length === 0 ? (
            <Text size="sm" c="dimmed">{t("none")}</Text>
          ) : (
            pending.map((invite) => (
              <Group key={invite._id} justify="space-between" wrap="nowrap" gap="sm">
                <Text size="sm">{invite.email} · {t(invite.role === "trainer" ? "roleTrainer" : "roleAthlete")}</Text>
                <Button size="sm" variant="default" onClick={() => void revoke(invite)}>{t("revoke")}</Button>
              </Group>
            ))
          )}
        </Stack>
      </Stack>
    </Paper>
  );
}
