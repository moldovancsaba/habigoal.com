"use client";

import Image from "next/image";
import { Anchor, Badge, Box, GdsIcons, Group, SimpleGrid, Stack, ThemeIcon } from "@sovereignsquad/gds/client";
import { ATHLETE_IQ_GOLD_LOGO_SRC } from "@/lib/product-surface-branding";
import { getProductColor } from "@/lib/product-ui-contracts";
import { Paper, Text, Title } from "@/components/gds/SurfacePrimitives";

type ProductEntryCardProps = {
  ariaLabel: string;
  action: string;
  badge: string;
  body: string;
  href: string;
  title: string;
  tone: "home" | "pro";
};

export function ProductEntryCard({
  ariaLabel,
  action,
  badge,
  body,
  href,
  title,
  tone
}: ProductEntryCardProps) {
  return (
    <Paper component="article" withBorder radius="md" p={{ base: "lg", md: "xl" }} className={tone === "pro" ? "selector-card selector-card-pro surface-outline" : "selector-card selector-card-home surface-outline"}>
      <Anchor className="selector-card-link" href={href} underline="never" c="inherit" aria-label={ariaLabel}>
        <Stack gap="lg" h="100%">
          <Group justify="space-between" align="flex-start" gap="md">
            <Badge variant="light" color={getProductColor(tone === "home" ? "habigoal" : "athlete_iq", "primaryAction")} w="fit-content" className={tone === "home" ? "selector-home-badge" : "selector-pro-badge"}>
              {badge}
            </Badge>
            {tone === "pro" ? (
              <Image src={ATHLETE_IQ_GOLD_LOGO_SRC} alt="" width={64} height={57} className="aiq-mark" />
            ) : (
              <Image src="/images/habigoal_logo.png" alt="" width={48} height={48} />
            )}
          </Group>
          <Stack gap={8}>
            <Title order={2} size="h2">
              {title}
            </Title>
            <Text className={tone === "pro" ? "selector-card-body-pro" : "selector-card-body-home"} size="lg">{body}</Text>
          </Stack>
          {tone === "home" ? <HabigoalSelectorPreview /> : <AthleteIqSelectorPreview />}
          <Group className="selector-card-action" gap="xs" mt="auto" wrap="nowrap">
            <Text fw={800}>{action}</Text>
            <GdsIcons.Launch size={16} aria-hidden="true" />
          </Group>
        </Stack>
      </Anchor>
    </Paper>
  );
}

function HabigoalSelectorPreview() {
  return (
    <Box className="selector-home-preview" aria-hidden="true">
      <Group justify="space-between" align="center" gap="sm">
        <Stack gap={6} className="selector-home-copy-lines">
          <Box className="selector-home-copy-line selector-home-copy-line-short" />
          <Box className="selector-home-copy-line selector-home-copy-line-wide" />
        </Stack>
        <Box className="selector-home-score" />
      </Group>
      <SimpleGrid cols={3} spacing={6}>
        <Box className="selector-home-tab" />
        <Box className="selector-home-tab" />
        <Box className="selector-home-tab" />
      </SimpleGrid>
    </Box>
  );
}

function AthleteIqSelectorPreview() {
  return (
    <Box className="selector-pro-preview" aria-hidden="true">
      <Box className="selector-pro-sidebar" />
      <Stack gap={8} className="selector-pro-grid">
        <Group gap={8} wrap="nowrap">
          <ThemeIcon color={getProductColor("athlete_iq", "primaryAction")} variant="light" radius="md">
            <GdsIcons.Dashboard size={16} />
          </ThemeIcon>
          <Box className="selector-pro-line selector-pro-line-wide" />
        </Group>
        <SimpleGrid cols={3} spacing={8}>
          <Box className="selector-pro-metric" />
          <Box className="selector-pro-metric" />
          <Box className="selector-pro-metric" />
        </SimpleGrid>
      </Stack>
    </Box>
  );
}
