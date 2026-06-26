"use client";

import Image from "next/image";
import { Badge, Box, Group, Paper, SimpleGrid, Stack, Text, ThemeIcon, Title } from "@mantine/core";
import { GdsIcons, SectionPanel } from "@doneisbetter/gds/client";
import type { ReactNode } from "react";
import { ATHLETE_IQ_GOLD_LOGO_SRC } from "@/lib/product-surface-branding";
import type { ProductFunction, ProductSurface, ProductSurfaceAudience, ProductSurfaceId } from "@/lib/product-surfaces";

export type SurfaceSignalState = "good" | "watch" | "risk" | "neutral";

export function SurfaceTopBar({ surface }: { surface: ProductSurface }) {
  return (
    <Group className={surface.id === "habigoal" ? "surface-topbar hbg-topbar" : "surface-topbar aiq-topbar"} align="center" mb="md">
      <Group gap="sm" wrap="nowrap">
        {surface.id === "habigoal" ? (
          <Image src="/images/habigoal_logo.png" alt="" width={32} height={32} />
        ) : (
          <Image src={ATHLETE_IQ_GOLD_LOGO_SRC} alt="" width={44} height={39} className="aiq-mini-logo" />
        )}
        <Stack gap={0}>
          <Text fw={900}>{surface.name}</Text>
          <Text size="sm" className={surface.id === "habigoal" ? "hbg-muted-text" : "aiq-muted-soft"}>{surface.operatingMode}</Text>
        </Stack>
      </Group>
    </Group>
  );
}

export function SectionHeading({ icon, title, copy, inverse = false }: { icon: ReactNode; title: string; copy: string; inverse?: boolean }) {
  return (
    <Group align="flex-start" gap="sm" wrap="nowrap">
      <ThemeIcon variant="light" color={inverse ? "yellow" : "teal"} radius="md" aria-hidden="true">
        {icon}
      </ThemeIcon>
      <Stack gap={2}>
        <Title order={2} size="h3">{title}</Title>
        <Text size="sm" className={inverse ? "aiq-muted" : "hbg-muted-text"}>{copy}</Text>
      </Stack>
    </Group>
  );
}

export function SignalCard({
  detail,
  inverse = false,
  label,
  state,
  value
}: {
  detail: string;
  inverse?: boolean;
  label: string;
  state: SurfaceSignalState;
  value: string;
}) {
  const color = state === "good" ? "green" : state === "risk" ? "red" : state === "watch" ? "yellow" : "gray";
  return (
    <Paper className={inverse ? "aiq-signal-card surface-outline" : "hbg-signal-card surface-outline"} withBorder radius="md" p="lg">
      <Stack gap={8}>
        <Group justify="space-between" gap="sm">
          <Text fw={900}>{label}</Text>
          <Badge color={color} variant="light">{state}</Badge>
        </Group>
        <Title order={3}>{value}</Title>
        <Text size="sm" className={inverse ? "aiq-muted" : "hbg-muted-text"}>{detail}</Text>
      </Stack>
    </Paper>
  );
}

export function SharedFoundationSection({
  inverse = false,
  relatedSurface,
  surface
}: {
  inverse?: boolean;
  relatedSurface?: ProductSurface;
  surface: ProductSurface;
}) {
  const title = relatedSurface ? `${surface.shortName} and ${relatedSurface.shortName} shared foundation` : `${surface.shortName} shared foundation`;
  return (
    <SectionPanel
      title={title}
      description="Both products use the same feature directory, data contracts, guidance audit trail, and backend capabilities. Product filtering changes the UI and permissions, not the source truth."
    >
      <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
        {surface.sharedDataContracts.map((contract) => (
          <Paper key={contract.id} className={inverse ? "aiq-data-card surface-outline" : "hbg-data-card surface-outline"} withBorder radius="md" p="lg">
            <Stack gap="sm">
              <Badge variant="light" color={inverse ? "yellow" : "teal"} w="fit-content">{contract.owner}</Badge>
              <Title order={3} size="h4">{contract.name}</Title>
              <Text size="sm" className={inverse ? "aiq-muted" : "hbg-muted-text"}>{contract.description}</Text>
              <Text size="sm"><strong>Sync:</strong> {contract.syncBehavior}</Text>
            </Stack>
          </Paper>
        ))}
      </SimpleGrid>
    </SectionPanel>
  );
}

export function FunctionDirectory({
  compact = false,
  featuredFunctions,
  surface
}: {
  compact?: boolean;
  featuredFunctions?: ProductFunction[];
  surface: ProductSurface;
}) {
  const functions = featuredFunctions ?? surface.functionRegistry;

  return (
    <SectionPanel
      title={`${surface.shortName} function directory`}
      description={surface.id === "habigoal" ? "Only client-safe support functions render in Habigoal." : "AthleteIQ includes every Habigoal function and adds professional-only modules."}
    >
      <SimpleGrid cols={{ base: 1, lg: compact ? 2 : 3 }} spacing="md">
        {functions.map((item) => (
          <FunctionCard key={item.id} item={item} productId={surface.id} />
        ))}
      </SimpleGrid>
    </SectionPanel>
  );
}

function FunctionCard({ item, productId }: { item: ProductFunction; productId: ProductSurfaceId }) {
  const pro = productId === "athlete-iq";
  return (
    <Paper component="article" className={pro ? "aiq-function-card surface-outline" : "hbg-function-card surface-outline"} withBorder radius="md" p="lg">
      <Stack gap="md">
        <Group justify="space-between" align="flex-start" gap="sm">
          <Stack gap={4} style={{ minWidth: 0 }}>
            <Group gap="xs" wrap="nowrap">
              <ThemeIcon variant="light" color={item.status === "planned" ? "gray" : pro ? "yellow" : "teal"} radius="md" aria-hidden="true">
                <GdsIcons.Check size={16} />
              </ThemeIcon>
              <Title order={3} size="h4">{item.name}</Title>
            </Group>
            <Text size="sm" className={pro ? "aiq-muted" : "hbg-muted-text"}>{item.summary}</Text>
          </Stack>
          <Badge variant="light" color={item.status === "planned" ? "gray" : pro ? "yellow" : "teal"}>{item.status}</Badge>
        </Group>
        <AudienceBadges audience={item.audience} pro={pro} />
        <DetailList title="Runtime flow" items={item.runtimeFlow.slice(0, 3)} pro={pro} />
        <Box className={pro ? "aiq-failure-pill" : "hbg-failure-pill"} px="sm" py="xs">
          <Text size="sm"><strong>Failure mode:</strong> {item.failureMode}</Text>
        </Box>
      </Stack>
    </Paper>
  );
}

function AudienceBadges({ audience, pro }: { audience: ProductSurfaceAudience[]; pro: boolean }) {
  return (
    <Group gap={6} wrap="wrap">
      {audience.map((item) => (
        <Badge key={item} variant="outline" color={pro ? "yellow" : "teal"}>{item}</Badge>
      ))}
    </Group>
  );
}

function DetailList({ items, pro, title }: { items: string[]; pro: boolean; title: string }) {
  return (
    <Stack gap={4}>
      <Text size="sm" tt="uppercase" fw={800} className={pro ? "aiq-muted-soft" : "hbg-muted-text"}>{title}</Text>
      <Box component="ul" m={0} ps="lg">
        {items.map((item) => (
          <Text component="li" key={item} size="sm" className={pro ? "aiq-muted" : "hbg-muted-text"}>{item}</Text>
        ))}
      </Box>
    </Stack>
  );
}
