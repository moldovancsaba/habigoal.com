"use client";

import { Badge, Box, Group, Stack } from "@sovereignsquad/gds/client";
import { Text } from "@/components/gds/SurfacePrimitives";
import { useTranslations } from "next-intl";
import type { InsightSignal, InsightSeverity } from "@/lib/athlete-insights";
import { getProductColor } from "@/lib/product-ui-contracts";

const SEVERITY_COLOR: Record<InsightSeverity, string> = {
  high: getProductColor("dashboard", "risk"),
  medium: getProductColor("dashboard", "warning"),
  low: getProductColor("dashboard", "neutral"),
};

// Renders the source-linked deterministic insight signals (#81). Each signal
// shows its severity, plain-language guidance, and an accessible disclosure of
// the exact records it was derived from — so guidance is transparent, never
// opaque. Returns null when there is nothing to surface.
export function InsightSignalsPanel({ signals }: { signals: InsightSignal[] }) {
  const t = useTranslations("AthleteInsights");
  if (!signals.length) return null;

  return (
    <Stack gap="sm">
      {signals.map((signal) => (
        <Box key={`${signal.kind}-${signal.date}`} component="article">
          <Group justify="space-between" align="flex-start" gap="sm" wrap="nowrap">
            <Text size="sm">{t(`body.${signal.bodyKey}`, signal.bodyParams)}</Text>
            <Badge color={SEVERITY_COLOR[signal.severity]} variant="light">
              {t(`severity.${signal.severity}`)}
            </Badge>
          </Group>
          <Box component="details" mt={4}>
            <Text component="summary" size="sm" c="dimmed" style={{ cursor: "pointer" }}>
              {t("sourcesLabel")}
            </Text>
            <Stack gap={2} mt={4}>
              {signal.sources.map((source, index) => (
                <Text key={`${source.type}-${index}`} size="sm" c="dimmed">
                  {t(`sourceType.${source.type}`)}
                  {source.date ? ` · ${source.date}` : ""}
                </Text>
              ))}
            </Stack>
          </Box>
        </Box>
      ))}
    </Stack>
  );
}
