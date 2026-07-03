"use client";

import { useState } from "react";
import { Paper, Text } from "@mantine/core";
import { Box, Group, Select, SemanticButton, Stack, Textarea } from "@sovereignsquad/gds/client";
import { useTranslations } from "next-intl";
import type { AthleteProfile } from "@/types/athlete";
import type { Team } from "@/types/team";
import { getProductColor } from "@/lib/product-ui-contracts";

type Message = {
  id?: string;
  recipientId: string;
  text: string;
  senderName: string;
  createdAt: string;
};

// Coach -> athlete team messaging inbox. The write path already existed; this adds
// the read path (GET /api/teams/:id/messages) + compose, scoped to a team and a
// recipient athlete. All copy is localized; React escapes message text on render.
export function TeamMessagesPanel({ teams, athletes }: { teams: Team[]; athletes: AthleteProfile[] }) {
  const t = useTranslations("CoachHub");
  const [teamId, setTeamId] = useState<string | null>(null);
  const [recipientId, setRecipientId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const team = teams.find((entry) => entry._id === teamId) ?? null;
  const teamOptions = teams.filter((entry) => entry._id).map((entry) => ({ value: entry._id as string, label: entry.name }));
  const recipientOptions = team
    ? athletes.filter((a) => a._id && team.athleteIds.includes(a._id)).map((a) => ({ value: a._id as string, label: a.name }))
    : [];

  async function loadThread(tid: string, rid: string, before?: string) {
    setLoading(true);
    setError(false);
    const params = new URLSearchParams({ recipientId: rid, limit: "30" });
    if (before) params.set("before", before);
    try {
      const res = await fetch(`/api/teams/${tid}/messages?${params.toString()}`);
      if (!res.ok) throw new Error("load failed");
      const data = await res.json();
      const batch: Message[] = Array.isArray(data.messages) ? data.messages : [];
      setMessages((prev) => (before ? [...prev, ...batch] : batch));
      setNextCursor(data.nextCursor);
    } catch {
      setError(true);
    }
    setLoading(false);
  }

  function onTeamChange(value: string | null) {
    setTeamId(value);
    setRecipientId(null);
    setMessages([]);
    setNextCursor(undefined);
    setError(false);
  }

  function onRecipientChange(value: string | null) {
    setRecipientId(value);
    setMessages([]);
    setNextCursor(undefined);
    if (teamId && value) void loadThread(teamId, value);
  }

  async function send() {
    if (!teamId || !recipientId || !draft.trim()) return;
    setSending(true);
    setError(false);
    try {
      const res = await fetch(`/api/teams/${teamId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId, text: draft.trim() }),
      });
      if (!res.ok) throw new Error("send failed");
      const data = await res.json();
      if (data?.message) setMessages((prev) => [data.message as Message, ...prev]);
      setDraft("");
    } catch {
      setError(true);
    }
    setSending(false);
  }

  return (
    <Stack gap="md">
      <Group grow>
        <Select label={t("messages.selectTeam")} placeholder={t("messages.pickTeam")} data={teamOptions} value={teamId} onChange={onTeamChange} />
        <Select
          label={t("messages.selectRecipient")}
          placeholder={t("messages.pickRecipient")}
          data={recipientOptions}
          value={recipientId}
          onChange={onRecipientChange}
          disabled={!team}
        />
      </Group>

      {!recipientId ? <Text size="sm" c="dimmed">{t("messages.pickRecipientFirst")}</Text> : null}

      {recipientId ? (
        <>
          <Group align="flex-end" gap="sm">
            <Box style={{ flex: 1 }}>
              <Textarea
                label={t("messages.composeLabel")}
                placeholder={t("messages.composePlaceholder")}
                value={draft}
                onChange={(event) => setDraft(event.currentTarget.value)}
                autosize
                minRows={2}
                maxRows={5}
                maxLength={2000}
              />
            </Box>
            <SemanticButton action="save" color={getProductColor("dashboard", "primaryAction")} loading={sending} disabled={!draft.trim()} onClick={() => void send()}>
              {t("messages.send")}
            </SemanticButton>
          </Group>

          {error ? (
            <Text size="sm" role="alert" style={{ color: "var(--status-error)" }}>{t("messages.loadError")}</Text>
          ) : null}
          {loading && messages.length === 0 ? <Text c="dimmed" role="status">{t("messages.loading")}</Text> : null}
          {!loading && messages.length === 0 ? <Text c="dimmed">{t("messages.empty")}</Text> : null}

          <Stack gap="sm" aria-live="polite">
            {messages.map((message) => (
              <Paper withBorder p="sm" key={message.id ?? `${message.createdAt}-${message.senderName}`}>
                <Group justify="space-between">
                  <Text fw={600}>{message.senderName}</Text>
                  <Text size="sm" c="dimmed">{message.createdAt.slice(0, 10)}</Text>
                </Group>
                <Text size="sm">{message.text}</Text>
              </Paper>
            ))}
          </Stack>

          {nextCursor ? (
            <SemanticButton
              action="refresh"
              variant="default"
              size="sm"
              loading={loading}
              onClick={() => {
                if (teamId && recipientId) void loadThread(teamId, recipientId, nextCursor);
              }}
            >
              {t("messages.loadOlder")}
            </SemanticButton>
          ) : null}
        </>
      ) : null}
    </Stack>
  );
}
