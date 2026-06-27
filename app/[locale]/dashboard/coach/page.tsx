"use client";

import { useEffect, useState } from "react";
import { Box, Loader, Stack, Text, SimpleGrid, Group, Badge, Paper } from "@mantine/core";
import { PageHeader, SectionPanel, SemanticButton, StateBlock } from "@doneisbetter/gds/client";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { formatScore } from "@/lib/utils";
import type { AthleteProfile } from "@/types/athlete";

// Readiness is recorded on a 0-5 gauge scale (see readiness-model). Map it to a
// traffic-light tone so the roster reflects real recorded status instead of a
// constant "Ready" badge.
function readinessTone(value: number): string {
  if (value >= 4) return "green";
  if (value >= 2.5) return "yellow";
  return "red";
}

interface ConcernItem {
  athleteId?: string;
  athleteName?: string;
  questionKey: string;
  score: number;
  severity: "watch" | "support";
}

export default function CoachDashboardPage() {
  const tc = useTranslations("Common");
  const t = useTranslations("CoachHub");

  const [athletes, setAthletes] = useState<AthleteProfile[]>([]);
  const [concerns, setConcerns] = useState<ConcernItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch("/api/athletes?metrics=true").then((res) => res.json()),
      fetch("/api/concerns").then((res) => res.json()),
    ])
      .then(([athleteData, concernData]) => {
        if (!active) return;
        setAthletes(Array.isArray(athleteData) ? athleteData : []);
        setConcerns(concernData?.concerns ?? []);
      })
      .catch(() => {
        if (!active) return;
        setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  if (loading) {
    return (
      <Box style={{ display: "flex", justifyContent: "center", paddingBlock: "2rem" }}>
        <Loader />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p="xl">
        <StateBlock variant="error" title={t("loadError")} description={tc("error")} />
      </Box>
    );
  }

  const readinessValues = athletes
    .map((athlete) => athlete.latestReadiness)
    .filter((value): value is number => typeof value === "number");
  const teamAvgReadiness = readinessValues.length
    ? readinessValues.reduce((sum, value) => sum + value, 0) / readinessValues.length
    : null;

  return (
    <Stack gap="xl" pb="xl">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      <SectionPanel title={t("teamOverview")}>
        <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
          <StateBlock
            variant="info"
            title={t("activeRoster")}
            description={t("activeRosterDesc", { count: athletes.length })}
          />
          <StateBlock
            variant="success"
            title={t("teamAvgReadiness")}
            description={
              teamAvgReadiness !== null
                ? t("teamAvgReadinessValue", { value: formatScore(teamAvgReadiness), count: readinessValues.length })
                : t("teamAvgReadinessDesc")
            }
          />
          <StateBlock
            variant="error"
            title={t("actionItems")}
            description={t("actionItemsDesc", { count: concerns.length })}
            action={<SemanticButton action="dashboard" variant="outline">{t("viewDetails")}</SemanticButton>}
          />
        </SimpleGrid>
      </SectionPanel>

      <SectionPanel title={t("athleteRoster")}>
        <Stack gap="md">
          {athletes.map((athlete) => (
            <Paper withBorder key={athlete._id} p="md">
              <Group justify="space-between">
                <Box>
                  <Group gap="xs" mb={4}>
                    <Text fw={700} size="lg">{athlete.name}</Text>
                    {typeof athlete.latestReadiness === "number" ? (
                      <Badge color={readinessTone(athlete.latestReadiness)} variant="light">
                        {t("readinessValue", { value: formatScore(athlete.latestReadiness) })}
                      </Badge>
                    ) : (
                      <Badge color="gray" variant="light">{t("readinessPending")}</Badge>
                    )}
                  </Group>
                  <Text size="sm" c="dimmed">
                    {athlete.latestLocation ? `@${athlete.latestLocation}` : t("statusActive")}
                  </Text>
                </Box>
                <Group>
                  <Link href={`/dashboard/athletes/${athlete._id}/intelligence`}>
                    <SemanticButton action="dashboard" variant="light" color="ingress">{t("intelligence")}</SemanticButton>
                  </Link>
                  <Link href={`/dashboard/athletes/${athlete._id}/vision`}>
                    <SemanticButton action="dashboard" variant="outline" color="strategy">{t("vision")}</SemanticButton>
                  </Link>
                  <Link href={`/dashboard/athletes/${athlete._id}/profile`}>
                    <SemanticButton action="settings" variant="outline">{t("profile")}</SemanticButton>
                  </Link>
                </Group>
              </Group>
            </Paper>
          ))}
          {athletes.length === 0 && (
            <StateBlock variant="info" title={t("noAthletes")} description={t("noAthletesDesc")} />
          )}
        </Stack>
      </SectionPanel>

      {concerns.length > 0 && (
        <SectionPanel title={t("concernFlags")}>
          <Stack gap="sm">
            {concerns.map((concern, index) => (
              <Paper key={`${concern.athleteId}-${concern.questionKey}-${index}`} withBorder p="md">
                <Group justify="space-between">
                  <Box>
                    <Text fw={600}>{concern.athleteName ?? concern.athleteId}</Text>
                    <Text size="sm" c="dimmed">{concern.questionKey}: score {concern.score}</Text>
                  </Box>
                  <Badge color={concern.severity === "support" ? "red" : "yellow"} variant="light">
                    {concern.severity}
                  </Badge>
                </Group>
              </Paper>
            ))}
          </Stack>
        </SectionPanel>
      )}
    </Stack>
  );
}
