"use client";

import { useState } from "react";
import { Text } from "@mantine/core";
import { MultiSelect, SectionPanel, Table } from "@sovereignsquad/gds/client";
import { useTranslations } from "next-intl";

// Athlete comparison / cohort (GH-526 P1). Compares selected athletes side by
// side against the squad average, using metrics the coach dashboard already
// loads (no new endpoint). Deterministic, honest — missing values render as "—".

type AthleteMetrics = {
  id: string;
  name: string;
  latestReadiness?: number;
  avgReadiness?: number;
  latestSki?: number;
  movement?: number;
  social?: number;
  mental?: number;
};

const METRICS: { key: keyof Omit<AthleteMetrics, "id" | "name">; labelKey: string }[] = [
  { key: "latestReadiness", labelKey: "compare.metricReadiness" },
  { key: "avgReadiness", labelKey: "compare.metricAvgReadiness" },
  { key: "latestSki", labelKey: "compare.metricOverall" },
  { key: "movement", labelKey: "compare.metricMovement" },
  { key: "social", labelKey: "compare.metricSocial" },
  { key: "mental", labelKey: "compare.metricMental" },
];

function fmt(value?: number): string {
  return typeof value === "number" && Number.isFinite(value) ? value.toFixed(1) : "—";
}

function average(values: number[]): number | undefined {
  const valid = values.filter((v) => typeof v === "number" && Number.isFinite(v));
  return valid.length ? valid.reduce((sum, v) => sum + v, 0) / valid.length : undefined;
}

export function ComparisonPanel({ athletes }: { athletes: AthleteMetrics[] }) {
  const t = useTranslations("CoachHub");
  const [selected, setSelected] = useState<string[]>([]);

  if (athletes.length < 2) return null;

  const chosen = selected.map((id) => athletes.find((a) => a.id === id)).filter((a): a is AthleteMetrics => Boolean(a));

  return (
    <SectionPanel title={t("compare.title")} description={t("compare.description")}>
      <MultiSelect
        label={t("compare.select")}
        placeholder={t("compare.selectPlaceholder")}
        data={athletes.map((a) => ({ value: a.id, label: a.name }))}
        value={selected}
        onChange={(value) => setSelected(value.slice(0, 3))}
        maxValues={3}
        searchable
        clearable
        mb="md"
      />
      {chosen.length === 0 ? (
        <Text size="sm" c="dimmed">{t("compare.empty")}</Text>
      ) : (
        <Table.ScrollContainer minWidth={360}>
          <Table striped withTableBorder>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t("compare.metric")}</Table.Th>
                {chosen.map((a) => (
                  <Table.Th key={a.id} style={{ textAlign: "right" }}>{a.name}</Table.Th>
                ))}
                <Table.Th style={{ textAlign: "right" }}>{t("compare.teamAverage")}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {METRICS.map((metric) => (
                <Table.Tr key={metric.key}>
                  <Table.Td>{t(metric.labelKey)}</Table.Td>
                  {chosen.map((a) => (
                    <Table.Td key={a.id} style={{ textAlign: "right" }}>{fmt(a[metric.key])}</Table.Td>
                  ))}
                  <Table.Td style={{ textAlign: "right", opacity: 0.7 }}>
                    {fmt(average(athletes.map((a) => a[metric.key]).filter((v): v is number => typeof v === "number")))}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}
    </SectionPanel>
  );
}
