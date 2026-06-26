"use client";

import { Badge, Box, Group, Paper, SimpleGrid, Stack, Text, ThemeIcon, Title } from "@mantine/core";
import { createGdsVocabularyPack, GdsIcons, PageHeader, SectionPanel, SemanticButton } from "@doneisbetter/gds/client";
import { useMemo, type ComponentType, type ReactNode } from "react";
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

  if (surface.id === "habigoal") {
    return (
      <Box className="habigoal-home-shell">
        <Box px={{ base: "md", md: "xl" }} py={{ base: "lg", md: "xl" }} maw={980} mx="auto">
          <Stack gap="lg">
            <PageHeader
              title="Habigoal"
              subtitle="Home wellbeing, habits, simple sport support, and clear status feedback."
              actions={
                <Group gap="xs" wrap="wrap">
                  <Link href="/" style={{ textDecoration: "none" }}>
                    <SemanticButton action="productSurface:home" variant="default" vocabularyPacks={[actionPack]} />
                  </Link>
                  <Link href="/athletes" style={{ textDecoration: "none" }}>
                    <SemanticButton action="productSurface:habigoal" color="ingress" vocabularyPacks={[actionPack]} />
                  </Link>
                </Group>
              }
            />

            <SectionPanel
              title="Simple daily loop"
              description="Habigoal keeps the home experience intentionally small: check in, complete habits, understand status, and take one safe next action."
            >
              <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
                <HomeStepCard icon={<GdsIcons.Check size={18} />} title="Check in" body="Capture today’s wellbeing and sport status without professional dashboards." />
                <HomeStepCard icon={<GdsIcons.Habit size={18} />} title="Habits" body="Keep the daily routine visible, lightweight, and easy to complete." />
                <HomeStepCard icon={<GdsIcons.Notifications size={18} />} title="Feedback" body="Show one clear support action using shared backend intelligence." />
              </SimpleGrid>
            </SectionPanel>

            <SectionPanel
              title="Shared backend, home UI"
              description="Habigoal uses the same database and scoring contracts as Athlete IQ, but the UI stays simplified for home users."
            >
              <Group gap="sm" wrap="wrap">
                <Badge variant="light" color="ingress">Home version</Badge>
                <Badge variant="light" color="gray">Unified backend</Badge>
                <Badge variant="light" color="gray">Unified database</Badge>
              </Group>
            </SectionPanel>
          </Stack>
        </Box>
      </Box>
    );
  }

  return (
    <Box className="aiq-pro-shell" style={{ minHeight: "100vh", color: "var(--text-primary)" }}>
      <Box px={{ base: "md", md: "xl" }} py={{ base: "lg", md: "xl" }} maw={1320} mx="auto">
        <Box className="aiq-layout-grid">
          <Paper component="aside" className="aiq-sidebar surface-outline" withBorder radius="md" p="lg">
            <Stack gap="xl">
              <Group gap="md" wrap="nowrap">
                <Box className="aiq-mark" aria-hidden="true">IQ</Box>
                <Stack gap={0}>
                  <Title order={1} size="h2">Athlete IQ</Title>
                  <Text className="aiq-letter-label">Performance OS</Text>
                </Stack>
              </Group>
              <Stack gap="lg">
                <AiqNavSection title="Today" items={[
                  ["Home", "/dashboard", GdsIcons.Home],
                  ["Check-in", "/athletes", GdsIcons.Profile],
                  ["Live Session", "/athlete-iq", GdsIcons.Play],
                  ["Daily To-Do", "/dashboard/planning", GdsIcons.Habit],
                  ["Learning Hub", "/dashboard/reports", GdsIcons.Lesson]
                ]} />
                <AiqNavSection title="Pillars" items={[
                  ["Recovery", "/dashboard/wearables", GdsIcons.Reward],
                  ["Fuel", "/dashboard", GdsIcons.Goal],
                  ["Mental", "/dashboard/athletes", GdsIcons.Record],
                  ["Reflection", "/dashboard/reports", GdsIcons.Edit],
                  ["Habits", "/athletes", GdsIcons.Check]
                ]} />
              </Stack>
            </Stack>
          </Paper>

          <Stack gap="md">
            <PageHeader
              title={surface.name}
              subtitle="Pro version for athletes, coaches, academies, dashboards, services, and advanced intelligence."
              actions={
                <Group gap="xs" wrap="wrap">
                  <Link href="/" style={{ textDecoration: "none" }}>
                    <SemanticButton action="productSurface:home" variant="default" vocabularyPacks={[actionPack]} />
                  </Link>
                  <Link href="/dashboard" style={{ textDecoration: "none" }}>
                    <SemanticButton action="productSurface:dashboard" color="strategy" vocabularyPacks={[actionPack]} />
                  </Link>
                </Group>
              }
            />

            <Paper component="section" className="aiq-command-panel surface-outline" withBorder radius="md" p={{ base: "md", md: "xl" }}>
              <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl">
                <Stack gap="md">
                  <Badge variant="light" color="yellow" w="fit-content">Pro version</Badge>
                  <Title order={2} size="h1">{surface.promise}</Title>
                  <Text className="aiq-command-copy" size="lg">{surface.summary}</Text>
                  <Group gap="sm" wrap="wrap">
                    <Badge variant="light" color="gray">Unified backend</Badge>
                    <Badge variant="light" color="gray">Unified database</Badge>
                    <Badge variant="light" color="yellow">Includes Habigoal signals</Badge>
                  </Group>
                </Stack>
                <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm" aria-label={`${surface.name} release summary`}>
                  <MetricCard label="Live functions" value={String(activeFunctions.length)} />
                  <MetricCard label="Roadmap functions" value={String(plannedFunctions.length)} />
                  <MetricCard label="Audiences" value={String(surface.audiences.length)} />
                </SimpleGrid>
              </SimpleGrid>
            </Paper>

            {relatedSurface ? (
              <SectionPanel
                title={`${surface.shortName} includes ${relatedSurface.shortName}`}
                description="Athlete IQ consumes Habigoal through shared contracts. The backend and database are unified, while the home and pro UIs stay separate."
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
              description="Professional functions are grouped by execution boundary, runtime flow, contracts, accessibility, observability, and failure behavior."
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
    </Box>
  );
}

function HomeStepCard({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <Paper className="glass-panel surface-outline" withBorder radius="md" p="lg">
      <Stack gap="sm">
        <ThemeIcon variant="light" color="ingress" radius="md" aria-hidden="true">
          {icon}
        </ThemeIcon>
        <Title order={3} size="h4">{title}</Title>
        <Text c="var(--text-secondary)" size="sm">{body}</Text>
      </Stack>
    </Paper>
  );
}

function AiqNavSection({ title, items }: { title: string; items: Array<[string, string, ComponentType<{ size?: number }>] > }) {
  return (
    <Stack gap="xs">
      <Text className="aiq-letter-label">{title}</Text>
      <Stack gap={6}>
        {items.map(([label, href, Icon], index) => (
          <Link key={label} href={href} className={index === 0 ? "aiq-nav-link aiq-nav-link-active" : "aiq-nav-link"}>
            <Icon size={18} />
            <span>{label}</span>
            {index === 0 ? <span className="aiq-nav-dot" aria-hidden="true" /> : null}
          </Link>
        ))}
      </Stack>
    </Stack>
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
