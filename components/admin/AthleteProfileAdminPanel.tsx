"use client";

import { useEffect, useState } from "react";
import { Group, Select, Stack, TextInput, TagsInput } from "@mantine/core";
import { SectionPanel, SemanticButton } from "@sovereignsquad/gds/client";
import { useTranslations } from "next-intl";
import { ATHLETE_PROFILE_STATUSES } from "@/lib/forms/central-form";
import { getProductColor } from "@/lib/product-ui-contracts";

const STATUS_OPTIONS = ATHLETE_PROFILE_STATUSES;

interface TeamOption {
  _id?: string;
  name: string;
}

interface AthleteProfileAdminPanelProps {
  athleteId: string;
}

export function AthleteProfileAdminPanel({ athleteId }: AthleteProfileAdminPanelProps) {
  const t = useTranslations("AthleteProfileAdmin");
  const tc = useTranslations("Common");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [position, setPosition] = useState("");
  const [status, setStatus] = useState<string | null>("active");
  const [parentEmail, setParentEmail] = useState("");
  const [injuryFlags, setInjuryFlags] = useState<string[]>([]);
  const [season, setSeason] = useState("");
  const [customKey, setCustomKey] = useState("");
  const [customValue, setCustomValue] = useState("");
  const [customAttributes, setCustomAttributes] = useState<Record<string, string>>({});

  useEffect(() => {
    void (async () => {
      try {
        const [athleteRes, teamRes] = await Promise.all([
          fetch(`/api/athletes/${athleteId}`),
          fetch("/api/teams"),
        ]);
        if (athleteRes.ok) {
          const athlete = await athleteRes.json();
          setTeamId(athlete.teamId ?? null);
          setPosition(athlete.position ?? "");
          setStatus(athlete.status ?? "active");
          setParentEmail(athlete.parentGuardianEmail ?? "");
          setInjuryFlags(Array.isArray(athlete.injuryHistoryFlags) ? athlete.injuryHistoryFlags : []);
          const latestSeason = Array.isArray(athlete.seasonHistory) ? athlete.seasonHistory.at(-1)?.season : "";
          setSeason(typeof latestSeason === "string" ? latestSeason : "");
          const attrs = athlete.customAttributes && typeof athlete.customAttributes === "object"
            ? Object.fromEntries(Object.entries(athlete.customAttributes).map(([k, v]) => [k, String(v)]))
            : {};
          setCustomAttributes(attrs);
        }
        if (teamRes.ok) {
          const json = await teamRes.json();
          setTeams(Array.isArray(json.teams) ? json.teams : []);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [athleteId]);

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch(`/api/athletes/${athleteId}/assignment`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId: teamId ?? undefined,
          position,
          status,
          parentGuardianEmail: parentEmail || undefined,
          injuryHistoryFlags: injuryFlags,
          season: season.trim() || undefined,
          customAttributes,
        }),
      });
      setMessage(res.ok ? tc("success") : tc("error"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  return (
    <SectionPanel title={t("title")} description={t("subtitle")}>
      <Stack gap="md">
        <Group grow align="flex-start">
          <TextInput label={t("position")} value={position} onChange={(e) => setPosition(e.currentTarget.value)} />
          <Select
            label={t("status")}
            data={STATUS_OPTIONS.map((value) => ({ value, label: t(`status_${value}`) }))}
            value={status}
            onChange={setStatus}
          />
        </Group>
        <Select
          label={t("team")}
          data={teams.map((team) => ({ value: team._id ?? "", label: team.name })).filter((o) => o.value)}
          value={teamId}
          onChange={setTeamId}
          clearable
        />
        <TextInput label={t("season")} value={season} onChange={(e) => setSeason(e.currentTarget.value)} placeholder="2025/26" />
        <TextInput label={t("parentEmail")} value={parentEmail} onChange={(e) => setParentEmail(e.currentTarget.value)} />
        <TagsInput label={t("injuryFlags")} value={injuryFlags} onChange={setInjuryFlags} placeholder={t("injuryFlagsPlaceholder")} />
        <Group grow align="flex-end">
          <TextInput label={t("customKey")} value={customKey} onChange={(e) => setCustomKey(e.currentTarget.value)} />
          <TextInput label={t("customValue")} value={customValue} onChange={(e) => setCustomValue(e.currentTarget.value)} />
          <SemanticButton
            action="add"
            variant="light"
            onClick={() => {
              if (!customKey.trim()) return;
              setCustomAttributes((current) => ({ ...current, [customKey.trim()]: customValue }));
              setCustomKey("");
              setCustomValue("");
            }}
          />
        </Group>
        <Group justify="flex-end">
          <SemanticButton action="save" color={getProductColor("dashboard", "primaryAction")} loading={saving} onClick={() => void handleSave()} />
        </Group>
        {message ? <span>{message}</span> : null}
      </Stack>
    </SectionPanel>
  );
}
