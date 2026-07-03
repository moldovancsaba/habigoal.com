"use client";

import { useState } from "react";
import { Paper, Text } from "@mantine/core";
import { Badge, Box, Button, Group, SectionPanel, Select, Stack } from "@sovereignsquad/gds/client";
import { useTranslations } from "next-intl";
import { getProductColor } from "@/lib/product-ui-contracts";

// Roster management (GH-526 P1): add/remove athletes per team via
// PATCH /api/teams/[teamId]/roster. Self-contained local state so the coach
// dashboard doesn't need to re-thread roster data.

type TeamRef = { id: string; name: string; athleteIds: string[] };
type AthleteRef = { id: string; name: string };

export function RosterManagerPanel({ teams, athletes }: { teams: TeamRef[]; athletes: AthleteRef[] }) {
  const t = useTranslations("CoachHub");
  const [rosters, setRosters] = useState<Record<string, string[]>>(
    () => Object.fromEntries(teams.map((team) => [team.id, [...team.athleteIds]]))
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const nameOf = (id: string) => athletes.find((a) => a.id === id)?.name ?? id;

  async function mutate(teamId: string, change: { add?: string; remove?: string }) {
    setBusy(`${teamId}:${change.add ?? change.remove}`);
    setError(false);
    const res = await fetch(`/api/teams/${encodeURIComponent(teamId)}/roster`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ add: change.add ? [change.add] : [], remove: change.remove ? [change.remove] : [] }),
    }).catch(() => null);
    if (res?.ok) {
      setRosters((current) => {
        const list = new Set(current[teamId] ?? []);
        if (change.add) list.add(change.add);
        if (change.remove) list.delete(change.remove);
        return { ...current, [teamId]: [...list] };
      });
    } else {
      setError(true);
    }
    setBusy(null);
  }

  if (teams.length === 0) return null;

  return (
    <SectionPanel title={t("roster.title")} description={t("roster.description")}>
      <Stack gap="md">
        {error ? <Text size="sm" style={{ color: "var(--status-error)" }}>{t("roster.saveError")}</Text> : null}
        {teams.map((team) => {
          const members = rosters[team.id] ?? [];
          const candidates = athletes.filter((a) => !members.includes(a.id));
          return (
            <Paper key={team.id} withBorder p="md" radius="md">
              <Stack gap="sm">
                <Group justify="space-between">
                  <Text fw={700}>{team.name}</Text>
                  <Badge variant="light">{t("roster.memberCount", { count: members.length })}</Badge>
                </Group>
                {members.length === 0 ? (
                  <Text size="sm" c="dimmed">{t("roster.noMembers")}</Text>
                ) : (
                  <Stack gap={4}>
                    {members.map((id) => (
                      <Group key={id} justify="space-between">
                        <Text size="sm">{nameOf(id)}</Text>
                        <Button
                          size="sm"
                          variant="subtle"
                          color={getProductColor("dashboard", "risk")}
                          loading={busy === `${team.id}:${id}`}
                          onClick={() => void mutate(team.id, { remove: id })}
                        >
                          {t("roster.remove")}
                        </Button>
                      </Group>
                    ))}
                  </Stack>
                )}
                <Box>
                  <Select
                    label={t("roster.addAthlete")}
                    placeholder={t("roster.addPlaceholder")}
                    data={candidates.map((a) => ({ value: a.id, label: a.name }))}
                    searchable
                    value={null}
                    onChange={(value) => value && void mutate(team.id, { add: value })}
                    nothingFoundMessage={t("roster.noCandidates")}
                  />
                </Box>
              </Stack>
            </Paper>
          );
        })}
      </Stack>
    </SectionPanel>
  );
}
