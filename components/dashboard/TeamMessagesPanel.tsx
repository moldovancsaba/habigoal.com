"use client";

import { useState } from "react";
import { Badge, Box, Button, Group, Paper, Select, SegmentedControl, Stack, Text, Textarea, TextInput } from "@mantine/core";
import { SemanticButton } from "@doneisbetter/gds/client";
import { useTranslations } from "next-intl";
import type { AthleteProfile } from "@/types/athlete";
import type { Team } from "@/types/team";

type Message = {
  id?: string;
  recipientId: string;
  text: string;
  senderName: string;
  createdAt: string;
  broadcastId?: string;
};

type ComposeMode = "direct" | "broadcast";

// Coach -> athlete team messaging inbox. The write path already existed; this adds
// the read path (GET /api/teams/:id/messages) + compose, scoped to a team and a
// recipient athlete, plus team-wide broadcast and cross-thread search
// (#team-messaging-p1). All copy is localized; React escapes message text on render.
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
  const [mode, setMode] = useState<ComposeMode>("direct");
  const [broadcastFeedback, setBroadcastFeedback] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Message[] | null>(null);
  const [searching, setSearching] = useState(false);

  const team = teams.find((entry) => entry._id === teamId) ?? null;
  const teamOptions = teams.filter((entry) => entry._id).map((entry) => ({ value: entry._id as string, label: entry.name }));
  const recipientOptions = team
    ? athletes.filter((a) => a._id && team.athleteIds.includes(a._id)).map((a) => ({ value: a._id as string, label: a.name }))
    : [];
  const athleteNameById = new Map(athletes.filter((a) => a._id).map((a) => [a._id as string, a.name]));

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
    setBroadcastFeedback(null);
    setSearchQuery("");
    setSearchResults(null);
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

  async function sendBroadcast() {
    if (!teamId || !draft.trim()) return;
    setSending(true);
    setError(false);
    setBroadcastFeedback(null);
    try {
      const res = await fetch(`/api/teams/${teamId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ broadcast: true, text: draft.trim() }),
      });
      if (!res.ok) throw new Error("broadcast failed");
      const data = await res.json();
      const count = Array.isArray(data?.messages) ? data.messages.length : 0;
      setBroadcastFeedback(t("messages.broadcastSent", { count }));
      setDraft("");
    } catch {
      setError(true);
    }
    setSending(false);
  }

  async function runSearch() {
    if (!teamId || !searchQuery.trim()) {
      setSearchResults(null);
      return;
    }
    setSearching(true);
    setError(false);
    try {
      const params = new URLSearchParams({ q: searchQuery.trim(), limit: "50" });
      const res = await fetch(`/api/teams/${teamId}/messages?${params.toString()}`);
      if (!res.ok) throw new Error("search failed");
      const data = await res.json();
      setSearchResults(Array.isArray(data.messages) ? data.messages : []);
    } catch {
      setError(true);
    }
    setSearching(false);
  }

  function clearSearch() {
    setSearchQuery("");
    setSearchResults(null);
  }

  return (
    <Stack gap="md">
      <Group grow>
        <Select label={t("messages.selectTeam")} placeholder={t("messages.pickTeam")} data={teamOptions} value={teamId} onChange={onTeamChange} />
        {mode === "direct" ? (
          <Select
            label={t("messages.selectRecipient")}
            placeholder={t("messages.pickRecipient")}
            data={recipientOptions}
            value={recipientId}
            onChange={onRecipientChange}
            disabled={!team}
          />
        ) : null}
      </Group>

      {team ? (
        <Group justify="space-between" align="flex-end" gap="sm" wrap="wrap">
          <SegmentedControl
            value={mode}
            onChange={(value) => {
              setMode(value as ComposeMode);
              setBroadcastFeedback(null);
              setError(false);
            }}
            data={[
              { value: "direct", label: t("messages.modeDirect") },
              { value: "broadcast", label: t("messages.modeBroadcast") }
            ]}
          />
          <Group gap="xs" align="flex-end">
            <TextInput
              label={t("messages.searchLabel")}
              placeholder={t("messages.searchPlaceholder")}
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.currentTarget.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void runSearch();
                }
              }}
            />
            <Button variant="light" color="ingress" size="sm" loading={searching} onClick={() => void runSearch()} disabled={!searchQuery.trim()}>
              {t("messages.search")}
            </Button>
            {searchResults !== null ? (
              <Button variant="default" size="sm" onClick={clearSearch}>
                {t("messages.clearSearch")}
              </Button>
            ) : null}
          </Group>
        </Group>
      ) : null}

      {error ? (
        <Text size="sm" role="alert" style={{ color: "var(--status-error)" }}>{t("messages.loadError")}</Text>
      ) : null}

      {searchResults !== null ? (
        <Stack gap="sm" aria-live="polite">
          <Text size="sm" c="dimmed">{t("messages.searchResultsCount", { count: searchResults.length })}</Text>
          {searchResults.length === 0 ? <Text c="dimmed">{t("messages.searchEmpty")}</Text> : null}
          {searchResults.map((message) => (
            <Paper withBorder p="sm" key={message.id ?? `${message.createdAt}-${message.senderName}`}>
              <Group justify="space-between" align="flex-start">
                <Stack gap={2}>
                  <Text fw={600}>{message.senderName} → {athleteNameById.get(message.recipientId) ?? message.recipientId}</Text>
                  {message.broadcastId ? <Badge size="sm" variant="light" color="ingress" w="fit-content">{t("messages.broadcastBadge")}</Badge> : null}
                </Stack>
                <Text size="sm" c="dimmed">{message.createdAt.slice(0, 10)}</Text>
              </Group>
              <Text size="sm">{message.text}</Text>
            </Paper>
          ))}
        </Stack>
      ) : mode === "broadcast" ? (
        team ? (
          <Stack gap="sm">
            <Textarea
              label={t("messages.broadcastComposeLabel")}
              placeholder={t("messages.composePlaceholder")}
              value={draft}
              onChange={(event) => setDraft(event.currentTarget.value)}
              autosize
              minRows={2}
              maxRows={5}
              maxLength={2000}
            />
            <Group justify="space-between" align="center">
              <Text size="sm" c="dimmed">{t("messages.broadcastRecipientCount", { count: team.athleteIds.length })}</Text>
              <SemanticButton
                action="save"
                color="ingress"
                loading={sending}
                disabled={!draft.trim() || team.athleteIds.length === 0}
                onClick={() => void sendBroadcast()}
              >
                {t("messages.sendBroadcast")}
              </SemanticButton>
            </Group>
            {broadcastFeedback ? <Text size="sm" c="ingress">{broadcastFeedback}</Text> : null}
          </Stack>
        ) : null
      ) : (
        <>
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
                <SemanticButton action="save" color="ingress" loading={sending} disabled={!draft.trim()} onClick={() => void send()}>
                  {t("messages.send")}
                </SemanticButton>
              </Group>

              {loading && messages.length === 0 ? <Text c="dimmed" role="status">{t("messages.loading")}</Text> : null}
              {!loading && messages.length === 0 ? <Text c="dimmed">{t("messages.empty")}</Text> : null}

              <Stack gap="sm" aria-live="polite">
                {messages.map((message) => (
                  <Paper withBorder p="sm" key={message.id ?? `${message.createdAt}-${message.senderName}`}>
                    <Group justify="space-between" align="flex-start">
                      <Stack gap={2}>
                        <Text fw={600}>{message.senderName}</Text>
                        {message.broadcastId ? <Badge size="sm" variant="light" color="ingress" w="fit-content">{t("messages.broadcastBadge")}</Badge> : null}
                      </Stack>
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
        </>
      )}
    </Stack>
  );
}
