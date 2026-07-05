"use client";

import { Box, Group, PageHeader as GdsPageHeader, Stack } from "@sovereignsquad/gds/client";
import { Text, Title } from "@/components/gds/SurfacePrimitives";
import type { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
};

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  if (subtitle == null || subtitle === false || typeof subtitle === "string") {
    return <GdsPageHeader title={title} subtitle={typeof subtitle === "string" ? subtitle : undefined} actions={actions} />;
  }

  return (
    <Group
      className="glass-panel"
      gap="md"
      justify="space-between"
      align="center"
      wrap="wrap"
      px={{ base: "md", sm: "lg" }}
      py={{ base: "md", sm: "md" }}
      mb="md"
      style={{
        borderRadius: "var(--mantine-radius-md)"
      }}
    >
      <Box style={{ minWidth: 0 }}>
        <Title order={1} size="h2" fw={800}>
          {title}
        </Title>
        <Text component="div" c="var(--text-secondary)" size="sm" style={{ lineHeight: 1.45 }}>
          {subtitle}
        </Text>
      </Box>
      {actions ? (
        <Stack
          gap="sm"
          style={{ alignItems: "flex-end", width: "100%" }}
        >
          {actions}
        </Stack>
      ) : null}
    </Group>
  );
}
