"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge, Box, Button, Group, Loader, Paper, SimpleGrid, Stack, Text, TextInput, Title } from "@mantine/core";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionCard } from "@/components/ui/SectionCard";
import type { AthleteProfile } from "@/types/athlete";

type AthleteListItem = AthleteProfile;

export function AthletesAppHome({ locale }: { locale: string }) {
  const t = useTranslations("AthletesApp");
  const [athletes, setAthletes] = useState<AthleteListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/athletes?metrics=true")
      .then((res) => res.json())
      .then((payload) => setAthletes(Array.isArray(payload) ? payload : []))
      .catch(() => setAthletes([]))
      .finally(() => setLoading(false));
  }, []);

  const filteredAthletes = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return athletes;

    return athletes.filter((athlete) => {
      const haystack = [
        athlete.name,
        athlete.birthDate,
        athlete.latestLocation,
        athlete.knownTraits,
        athlete.parentSignals
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [athletes, search]);

  const summary = useMemo(() => {
    const total = athletes.length;
    const tracked = athletes.filter((athlete) => (athlete.assessmentCount ?? 0) > 0);
    const checkIns = athletes.reduce((sum, athlete) => sum + (athlete.assessmentCount ?? 0), 0);
    const readinessValues = athletes
      .map((athlete) => athlete.latestReadiness ?? 0)
      .filter((value) => value > 0);
    const averageReadiness = readinessValues.length
      ? (readinessValues.reduce((sum, value) => sum + value, 0) / readinessValues.length).toFixed(1)
      : "0.0";

    return {
      total,
      tracked: tracked.length,
      checkIns,
      averageReadiness
    };
  }, [athletes]);

  return (
    <Box style={{ minHeight: "100vh", color: "var(--text-primary)" }}>
      <Box px={{ base: "md", md: "xl" }} py={{ base: "lg", md: "xl" }} maw={1320} mx="auto">
        <PageHeader
          title={t("title")}
          subtitle={t("subtitle")}
          actions={
            <Group gap="sm" justify="flex-end">
              <Link href="/" style={{ textDecoration: "none" }}>
                <Button variant="default">{t("backHome")}</Button>
              </Link>
              <Link href={`/${locale}/news`} style={{ textDecoration: "none" }}>
                <Button variant="light">{t("whatsNew")}</Button>
              </Link>
            </Group>
          }
        />

        <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md" mb="md">
          <SummaryCard label={t("summaryTracked")} value={String(summary.tracked)} hint={t("summaryTrackedHint", { total: summary.total })} />
          <SummaryCard label={t("summaryReadiness")} value={summary.averageReadiness} hint={t("summaryReadinessHint")} />
          <SummaryCard label={t("summaryCheckIns")} value={String(summary.checkIns)} hint={t("summaryCheckInsHint")} />
        </SimpleGrid>

        <SectionCard
          title={t("directoryTitle")}
          subheader={t("directorySubtitle")}
          action={
            <TextInput
              value={search}
              onChange={(event) => setSearch(event.currentTarget.value)}
              placeholder={t("searchPlaceholder")}
              radius="md"
            />
          }
        >
          {loading ? (
            <Group justify="center" py="xl">
              <Loader color="var(--mantine-color-ingress-6)" />
            </Group>
          ) : filteredAthletes.length === 0 ? (
            <Text c="dimmed">{t("empty")}</Text>
          ) : (
            <SimpleGrid cols={{ base: 1, md: 2, xl: 3 }} spacing="md">
              {filteredAthletes.map((athlete) => (
                <AthletePreviewCard key={athlete._id ?? `${athlete.name}-${athlete.birthDate}`} athlete={athlete} locale={locale} />
              ))}
            </SimpleGrid>
          )}
        </SectionCard>
      </Box>
    </Box>
  );
}

function SummaryCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <Paper withBorder radius="md" p="lg" className="glass-panel surface-outline">
      <Stack gap={6}>
        <Text size="sm" tt="uppercase" c="var(--text-secondary)">
          {label}
        </Text>
        <Title order={2}>{value}</Title>
        <Text size="sm" c="var(--text-secondary)">
          {hint}
        </Text>
      </Stack>
    </Paper>
  );
}

function AthletePreviewCard({ athlete, locale }: { athlete: AthleteListItem; locale: string }) {
  const t = useTranslations("AthletesApp");
  const readiness = athlete.latestReadiness ?? 0;
  const readinessLabel = getReadinessLabel(readiness, t);
  const readinessColor = getReadinessColor(readiness);
  const age = getAgeLabel(athlete.birthDate, t);

  return (
    <Paper withBorder radius="md" p="lg" className="glass-panel surface-outline">
      <Stack gap="md" h="100%">
        <Group justify="space-between" align="flex-start">
          <Stack gap={4}>
            <Title order={3}>{athlete.name}</Title>
            <Text size="sm" c="var(--text-secondary)">
              {age}
            </Text>
          </Stack>
          <Badge color={readinessColor} variant="light">
            {readinessLabel}
          </Badge>
        </Group>

        <Text size="sm" c="var(--text-secondary)" style={{ minHeight: 44 }}>
          {athlete.latestLocation ? t("locationHint", { location: athlete.latestLocation }) : t("locationHintEmpty")}
        </Text>

        <SimpleGrid cols={2} spacing="sm">
          <MetricMini label={t("metricReadiness")} value={formatScore(athlete.latestReadiness)} />
          <MetricMini label={t("metricAverage")} value={formatScore(athlete.avgReadiness)} />
          <MetricMini label={t("metricCheckIns")} value={String(athlete.assessmentCount ?? 0)} />
          <MetricMini label={t("metricOverall")} value={formatScore(athlete.latestSki)} />
        </SimpleGrid>

        <SimpleGrid cols={3} spacing="xs">
          <PillarChip label={t("pillarMovement")} value={formatScore(athlete.latestScores?.movement)} />
          <PillarChip label={t("pillarSocial")} value={formatScore(athlete.latestScores?.social)} />
          <PillarChip label={t("pillarMental")} value={formatScore(athlete.latestScores?.mental)} />
        </SimpleGrid>

        <Group mt="auto" gap="sm">
          {athlete._id ? (
            <Link href={`/${locale}/athletes/${athlete._id}`} style={{ textDecoration: "none", width: "100%" }}>
              <Button variant="light" fullWidth>{t("openProfile")}</Button>
            </Link>
          ) : null}
          <Link href={`/${locale}/dashboard/assessment${athlete._id ? `?childId=${athlete._id}` : ""}`} style={{ textDecoration: "none", width: "100%" }}>
            <Button color="ingress" fullWidth>{t("startCheckIn")}</Button>
          </Link>
        </Group>
      </Stack>
    </Paper>
  );
}

function MetricMini({ label, value }: { label: string; value: string }) {
  return (
    <Stack gap={2}>
      <Text size="sm" tt="uppercase" c="var(--text-secondary)">
        {label}
      </Text>
      <Text fw={700} size="lg">
        {value}
      </Text>
    </Stack>
  );
}

function PillarChip({ label, value }: { label: string; value: string }) {
  return (
    <Box className="glass-pill" px="sm" py={8} style={{ borderRadius: 14 }}>
      <Stack gap={0} align="center">
        <Text size="sm" c="var(--text-secondary)">
          {label}
        </Text>
        <Text fw={700}>{value}</Text>
      </Stack>
    </Box>
  );
}

function formatScore(value?: number) {
  return typeof value === "number" && Number.isFinite(value) ? value.toFixed(1) : "0.0";
}

function getReadinessLabel(readiness: number, t: ReturnType<typeof useTranslations>) {
  if (readiness >= 4) return t("readinessReady");
  if (readiness >= 3) return t("readinessWatch");
  return t("readinessSupport");
}

function getReadinessColor(readiness: number) {
  if (readiness >= 4) return "strategy";
  if (readiness >= 3) return "synthesis";
  return "review";
}

function getAgeLabel(birthDate: string, t: ReturnType<typeof useTranslations>) {
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return t("ageUnknown");

  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const hasBirthdayPassed =
    now.getMonth() > birth.getMonth() ||
    (now.getMonth() === birth.getMonth() && now.getDate() >= birth.getDate());

  if (!hasBirthdayPassed) age -= 1;
  return t("ageValue", { age });
}
