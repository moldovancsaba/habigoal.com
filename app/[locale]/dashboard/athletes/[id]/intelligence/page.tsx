"use client";

import { useCallback, useEffect, useState } from "react";
import { Paper, Text } from "@mantine/core";
import { Badge, Box, Group, Loader, PageHeader, SectionPanel, SemanticButton, SimpleGrid, Stack } from "@sovereignsquad/gds/client";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { athleteIqJsonInit, athleteIqRequest, type AthleteIqClientResult } from "@/lib/athleteiq-client";
import { useAthleteIqDomainCopy } from "@/components/product/athlete-iq/useAthleteIqDomainCopy";
import type { AthleteTwinProjection, ProfileDimension } from "@/types/athleteiq-twin-projection";
import { getProductColor } from "@/lib/product-ui-contracts";

type TwinResponse = { projection: AthleteTwinProjection };

const STATUS_COLOR: Record<string, string> = {
  active: getProductColor("dashboard", "success"),
  lite_manual: getProductColor("dashboard", "warning"),
  future: getProductColor("dashboard", "neutral"),
  setup_required: getProductColor("dashboard", "warning"),
  redacted: getProductColor("dashboard", "neutral")
};

const CONFIDENCE_COLOR: Record<string, string> = {
  high: getProductColor("dashboard", "success"),
  medium: getProductColor("dashboard", "warning"),
  low: getProductColor("dashboard", "risk"),
  insufficient: getProductColor("dashboard", "neutral")
};

export default function AthleteIntelligencePage() {
  const params = useParams<{ id: string }>();
  const athleteId = params?.id ?? "";
  const t = useTranslations("AthleteIntelligence");
  const domain = useAthleteIqDomainCopy();
  const [projection, setProjection] = useState<AthleteTwinProjection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [rebuilding, setRebuilding] = useState(false);

  const fetchTwin = useCallback(
    () => athleteIqRequest<TwinResponse>(`/api/athleteiq/athletes/${encodeURIComponent(athleteId)}/twin?view=coach&timezone=UTC`),
    [athleteId]
  );

  const apply = useCallback((result: AthleteIqClientResult<TwinResponse>) => {
    if (result.ok) {
      setProjection(result.data.projection);
      setError(false);
    } else {
      setError(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;
    fetchTwin().then((result) => {
      if (active) apply(result);
    });
    return () => {
      active = false;
    };
  }, [fetchTwin, apply]);

  async function rebuild() {
    setRebuilding(true);
    const result = await athleteIqRequest<TwinResponse>(
      `/api/athleteiq/athletes/${encodeURIComponent(athleteId)}/twin/rebuild`,
      athleteIqJsonInit({ view: "coach", timezone: "UTC" })
    );
    if (result.ok) {
      setProjection(result.data.projection);
      setError(false);
    } else {
      setError(true);
    }
    setRebuilding(false);
  }

  function reload() {
    setLoading(true);
    setError(false);
    void fetchTwin().then(apply);
  }

  if (loading) {
    return (
      <Box style={{ display: "flex", justifyContent: "center", padding: "2rem" }}>
        <Loader />
      </Box>
    );
  }

  if (error || !projection) {
    return (
      <Stack gap="md">
        <PageHeader title={t("title")} />
        <Text c="dimmed">{t("loadError")}</Text>
        <SemanticButton action="refresh" variant="light" onClick={reload}>{t("retry")}</SemanticButton>
      </Stack>
    );
  }

  const radarDimensions = [...projection.activeDimensions, ...projection.liteDimensions];
  const radarData = radarDimensions
    .map((dimension) => ({ dimension: dimensionLabel(dimension.key, t), value: dimensionScore(dimension), fullMark: 100 }))
    .filter((point): point is { dimension: string; value: number; fullMark: number } => point.value !== null);

  const recommendations = collectRecommendations(projection);

  return (
    <Stack gap="md">
      <PageHeader
        title={projection.athlete.name ? t("titleWithName", { name: projection.athlete.name }) : t("title")}
        subtitle={t("subtitle")}
        actions={
          <Group gap="sm" wrap="wrap">
            <Badge color={CONFIDENCE_COLOR[projection.sourceConfidence]} variant="light">
              {t("confidenceLabel", { confidence: t(`confidence.${projection.sourceConfidence}`) })}
            </Badge>
            <SemanticButton action="refresh" variant="light" loading={rebuilding} onClick={() => void rebuild()}>{t("rebuild")}</SemanticButton>
          </Group>
        }
      />

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
        <SectionPanel title={t("twinDimensions")}>
          {radarData.length >= 3 ? (
            <Box style={{ width: "100%", height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="dimension" />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} />
                  <Radar name={projection.athlete.name ?? "Athlete"} dataKey="value" stroke="var(--mantine-color-ingress-6)" fill="var(--mantine-color-ingress-6)" fillOpacity={0.6} />
                </RadarChart>
              </ResponsiveContainer>
            </Box>
          ) : (
            <Text c="dimmed">{t("notEnoughDimensions")}</Text>
          )}
        </SectionPanel>

        <Stack gap="md">
          <SectionPanel title={t("recommendations")}>
            {recommendations.length === 0 ? (
              <Text c="dimmed">{t("noRecommendations")}</Text>
            ) : (
              <Stack gap="sm">
                {recommendations.map((code, index) => (
                  <Paper key={`${code}-${index}`} withBorder p="md">
                    <Text size="sm">{domain(code)}</Text>
                  </Paper>
                ))}
              </Stack>
            )}
          </SectionPanel>

          <SectionPanel title={t("dataSources")}>
            <Stack gap="sm">
              {radarDimensions.map((dimension) => (
                <Paper key={dimension.key} withBorder p="md">
                  <Group justify="space-between" align="flex-start">
                    <Box>
                      <Text fw={600}>{dimensionLabel(dimension.key, t)}</Text>
                      <Text size="sm" c="dimmed">
                        {dimension.sourceLabels.map((label) => domain(label)).join(" · ") || t("noSources")}
                      </Text>
                      {dimension.lastUpdatedAt ? (
                        <Text size="sm" c="dimmed">{t("updatedLabel", { date: dimension.lastUpdatedAt.slice(0, 10) })}</Text>
                      ) : null}
                    </Box>
                    <Stack gap={4} align="flex-end">
                      <Badge color={STATUS_COLOR[dimension.status] ?? getProductColor("dashboard", "neutral")} variant="light">{t(`status.${dimension.status}`)}</Badge>
                      <Badge color={CONFIDENCE_COLOR[dimension.confidence]} variant="light">{t(`confidence.${dimension.confidence}`)}</Badge>
                    </Stack>
                  </Group>
                </Paper>
              ))}
            </Stack>
          </SectionPanel>
        </Stack>
      </SimpleGrid>
    </Stack>
  );
}

function dimensionLabel(key: string, t: ReturnType<typeof useTranslations>): string {
  return t.has(`dimensions.${key}`) ? t(`dimensions.${key}`) : key.replace(/[_-]+/g, " ");
}

// Normalise a dimension's value summary to a 0-100 radar score, or null when not scorable.
function dimensionScore(dimension: ProfileDimension): number | null {
  const summary = dimension.valueSummary;
  if (!summary) return null;

  const num = (value: unknown): number | null => (typeof value === "number" && Number.isFinite(value) ? value : null);

  switch (dimension.key) {
    case "readiness":
      return clamp(num(summary.readinessScore) ?? num(summary.dailyIqScore));
    case "mental_edge":
      return clamp(num(summary.score));
    case "pain_safety":
      return painScore(summary.riskLevel);
    case "habits": {
      const rate = num(summary.completionRate);
      return rate === null ? null : clamp(rate <= 1 ? rate * 100 : rate);
    }
    case "daily_plan": {
      const total = num(summary.taskCount);
      const open = num(summary.openTasks);
      if (total === null || total === 0 || open === null) return null;
      return clamp(((total - open) / total) * 100);
    }
    case "cognitive_lite": {
      const bands = Array.isArray(summary.traitBands) ? (summary.traitBands as Array<{ score?: unknown }>) : [];
      const scores = bands.map((band) => num(band.score)).filter((value): value is number => value !== null);
      return scores.length ? clamp(scores.reduce((sum, value) => sum + value, 0) / scores.length) : null;
    }
    default:
      return null;
  }
}

function painScore(riskLevel: unknown): number | null {
  switch (riskLevel) {
    case "none":
      return 100;
    case "low":
      return 75;
    case "moderate":
      return 45;
    case "high":
      return 15;
    default:
      return null;
  }
}

function collectRecommendations(projection: AthleteTwinProjection): string[] {
  const codes: string[] = [];
  for (const dimension of projection.activeDimensions) {
    const summary = dimension.valueSummary;
    if (!summary) continue;
    if (dimension.key === "daily_plan") {
      const recommendation = summary.recommendation as { rationale?: unknown } | undefined;
      if (recommendation && Array.isArray(recommendation.rationale)) {
        codes.push(...recommendation.rationale.filter((value): value is string => typeof value === "string"));
      }
    }
    if (dimension.key === "pain_safety" && Array.isArray(summary.reasonCodes)) {
      codes.push(...(summary.reasonCodes as unknown[]).filter((value): value is string => typeof value === "string"));
    }
  }
  return Array.from(new Set(codes));
}

function clamp(value: number | null): number | null {
  if (value === null) return null;
  return Math.min(100, Math.max(0, Math.round(value)));
}
