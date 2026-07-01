"use client";

import { useEffect, useState } from "react";
import { Button, Group, NumberInput, Select, Stack, Text } from "@mantine/core";
import { SectionPanel } from "@doneisbetter/gds/client";
import { useTranslations } from "next-intl";

// Per-team readiness/alert threshold editor (#525 P0). Coach/admin adjusts the
// green/yellow cut-offs on the 0–5 readiness gauge; persisted via
// PATCH /api/athleteiq/coach/thresholds.

type TeamRef = { id: string; name: string };

export function ThresholdsPanel({ teams }: { teams: TeamRef[] }) {
  const t = useTranslations("CoachHub");
  const [teamId, setTeamId] = useState<string>(teams[0]?.id ?? "");
  const [greenMin, setGreenMin] = useState<number>(4);
  const [yellowMin, setYellowMin] = useState<number>(2.5);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  useEffect(() => {
    if (!teamId) return;
    let active = true;
    fetch(`/api/athleteiq/coach/thresholds?teamId=${encodeURIComponent(teamId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((payload) => {
        if (!active || !payload?.thresholds) return;
        setGreenMin(payload.thresholds.greenMin);
        setYellowMin(payload.thresholds.yellowMin);
        setState("idle");
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [teamId]);

  async function save() {
    if (!teamId) return;
    setState("saving");
    const res = await fetch(`/api/athleteiq/coach/thresholds?teamId=${encodeURIComponent(teamId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ greenMin, yellowMin }),
    }).catch(() => null);
    setState(res?.ok ? "saved" : "error");
  }

  if (teams.length === 0) return null;

  return (
    <SectionPanel title={t("thresholds.title")} description={t("thresholds.description")}>
      <Stack gap="sm">
        {teams.length > 1 ? (
          <Select
            label={t("thresholds.selectTeam")}
            data={teams.map((team) => ({ value: team.id, label: team.name }))}
            value={teamId}
            onChange={(value) => setTeamId(value ?? teams[0].id)}
            allowDeselect={false}
          />
        ) : null}
        <Group grow align="flex-end">
          <NumberInput
            label={t("thresholds.greenMin")}
            value={greenMin}
            onChange={(value) => {
              setGreenMin(typeof value === "number" ? value : 4);
              setState("idle");
            }}
            min={0}
            max={5}
            step={0.1}
            decimalScale={1}
          />
          <NumberInput
            label={t("thresholds.yellowMin")}
            value={yellowMin}
            onChange={(value) => {
              setYellowMin(typeof value === "number" ? value : 2.5);
              setState("idle");
            }}
            min={0}
            max={5}
            step={0.1}
            decimalScale={1}
          />
        </Group>
        <Text size="sm" c="dimmed">{t("thresholds.scaleHint")}</Text>
        {state === "error" ? <Text size="sm" style={{ color: "var(--status-error)" }}>{t("thresholds.saveError")}</Text> : null}
        {state === "saved" ? <Text size="sm" style={{ color: "var(--status-success)" }}>{t("thresholds.saved")}</Text> : null}
        <Group justify="flex-end">
          <Button size="sm" loading={state === "saving"} disabled={greenMin <= yellowMin} onClick={() => void save()}>
            {t("thresholds.save")}
          </Button>
        </Group>
      </Stack>
    </SectionPanel>
  );
}
