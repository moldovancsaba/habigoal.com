"use client";

import { Badge, Box, Group, Paper, SimpleGrid, Stack, Text, ThemeIcon, Title } from "@mantine/core";
import { createGdsVocabularyPack, GdsIcons, PageHeader, SectionPanel, SemanticButton } from "@doneisbetter/gds/client";
import { useMemo } from "react";
import { Link } from "@/i18n/navigation";
import type { ProductFunction, ProductSurface } from "@/lib/product-surfaces";

type ProductSurfacePageProps = {
  surface: ProductSurface;
  relatedSurface?: ProductSurface;
};

export function ProductSurfacePage({ surface, relatedSurface }: ProductSurfacePageProps) {
  const actionPack = useMemo(
    () =>
      createGdsVocabularyPack("productSurface", {
        home: { defaultMessage: "Home", icon: GdsIcons.Back },
        dashboard: { defaultMessage: "Open dashboard", icon: GdsIcons.Dashboard },
        habigoal: { defaultMessage: "Open Habigoal", icon: GdsIcons.Profile },
        aiq: { defaultMessage: "Open Athlete IQ", icon: GdsIcons.Dashboard }
      }),
    []
  );
  const activeFunctions = surface.functionRegistry.filter((item) => item.status === "phase-1" || item.status === "active");
  const plannedFunctions = surface.functionRegistry.filter((item) => item.status === "planned");

  return (
    <Box style={{ minHeight: "100vh", color: "var(--text-primary)" }}>
      <Box px={{ base: "md", md: "xl" }} py={{ base: "lg", md: "xl" }} maw={1320} mx="auto">
        <Stack gap="md">
          <PageHeader
            title={surface.name}
            subtitle={surface.headline}
            actions={
              <Group gap="xs" wrap="wrap">
                <Link href="/" style={{ textDecoration: "none" }}>
                  <SemanticButton action="productSurface:home" variant="default" vocabularyPacks={[actionPack]} />
                </Link>
                <Link href={surface.id === "habigoal" ? "/athletes" : "/dashboard"} style={{ textDecoration: "none" }}>
                  <SemanticButton action="productSurface:dashboard" color="ingress" vocabularyPacks={[actionPack]} />
                </Link>
              </Group>
            }
          />

          <Paper component="section" className="glass-panel surface-outline" withBorder radius="md" p={{ base: "md", md: "xl" }}>
            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl">
              <Stack gap="md">
                <Badge variant="light" color={surface.id === "habigoal" ? "ingress" : "strategy"} w="fit-content">
                  {surface.operatingMode}
                </Badge>
                <Title order={1} size="h2">
                  {surface.promise}
                </Title>
                <Text c="var(--text-secondary)" size="lg">
                  {surface.summary}
                </Text>
              </Stack>
              <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm" aria-label={`${surface.name} release summary`}>
                <MetricCard label="Phase-one functions" value={String(activeFunctions.length)} />
                <MetricCard label="Planned functions" value={String(plannedFunctions.length)} />
                <MetricCard label="Audiences" value={String(surface.audiences.length)} />
              </SimpleGrid>
            </SimpleGrid>
          </Paper>

          {relatedSurface ? (
            <SectionPanel
              title={`${surface.shortName} includes ${relatedSurface.shortName}`}
              description="The professional system consumes Habigoal through shared contracts. The UI and function registry stay separate so client wellbeing workflows remain simple."
            >
              <Group gap="sm" wrap="wrap">
                <Link href={relatedSurface.primaryPath} style={{ textDecoration: "none" }}>
                  <SemanticButton action="productSurface:habigoal" variant="default" vocabularyPacks={[actionPack]} />
                </Link>
                <Link href="/dashboard" style={{ textDecoration: "none" }}>
                  <SemanticButton action="productSurface:dashboard" color="strategy" vocabularyPacks={[actionPack]} />
                </Link>
              </Group>
            </SectionPanel>
          ) : null}

          <SectionPanel
            title={`${surface.shortName} function registry`}
            description="Production functions are grouped by execution boundary, runtime flow, contracts, accessibility, observability, and failure behavior."
          >
            <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
              {surface.functionRegistry.map((item) => (
                <FunctionCard key={item.id} item={item} />
              ))}
            </SimpleGrid>
          </SectionPanel>
        </Stack>
      </Box>
    </Box>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Paper className="glass-elevated surface-outline" withBorder radius="md" p="md">
      <Stack gap={4}>
        <Text size="sm" tt="uppercase" c="var(--text-secondary)" fw={700}>
          {label}
        </Text>
        <Title order={2}>{value}</Title>
      </Stack>
    </Paper>
  );
}

function FunctionCard({ item }: { item: ProductFunction }) {
  return (
    <Paper component="article" className="glass-panel surface-outline" withBorder radius="md" p="lg">
      <Stack gap="md">
        <Group justify="space-between" align="flex-start" gap="sm">
          <Stack gap={4} style={{ minWidth: 0 }}>
            <Group gap="xs" wrap="nowrap">
              <ThemeIcon variant="light" color={item.status === "planned" ? "gray" : "ingress"} radius="md" aria-hidden="true">
                <GdsIcons.Check size={16} />
              </ThemeIcon>
              <Title order={3} size="h4">
                {item.name}
              </Title>
            </Group>
            <Text size="sm" c="var(--text-secondary)">
              {item.summary}
            </Text>
          </Stack>
          <Badge variant="light" color={item.status === "planned" ? "gray" : "ingress"}>
            {item.status}
          </Badge>
        </Group>

        <DetailList title="Runtime flow" items={item.runtimeFlow} />
        <DetailList title="Contracts" items={item.contracts} />
        <DetailList title="Accessibility" items={item.accessibility} />
        <DetailList title="Observability" items={item.observability} />

        <Box className="glass-pill" px="sm" py="xs" style={{ borderRadius: "var(--mantine-radius-md)" }}>
          <Text size="sm">
            <strong>Failure mode:</strong> {item.failureMode}
          </Text>
        </Box>
      </Stack>
    </Paper>
  );
}

function DetailList({ title, items }: { title: string; items: string[] }) {
  return (
    <Stack gap={4}>
      <Text size="sm" tt="uppercase" fw={700} c="var(--text-secondary)">
        {title}
      </Text>
      <Box component="ul" m={0} ps="lg">
        {items.map((item) => (
          <Text component="li" key={item} size="sm" c="var(--text-secondary)">
            {item}
          </Text>
        ))}
      </Box>
    </Stack>
  );
}
