"use client";

import { Box, Flex, Text, Title } from "@mantine/core";
import type { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
};

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <Flex
      className="glass-panel surface-outline"
      gap="md"
      direction={{ base: "column", md: "row" }}
      justify="space-between"
      align={{ base: "stretch", md: "center" }}
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
        {subtitle ? (
          <Text component="div" c="var(--text-secondary)" size="sm" style={{ lineHeight: 1.45 }}>
            {subtitle}
          </Text>
        ) : null}
      </Box>
      {actions ? (
        <Flex
          gap="sm"
          wrap={{ base: "wrap", md: "nowrap" }}
          justify={{ base: "stretch", md: "flex-end" }}
          style={{ width: "100%" }}
        >
          {actions}
        </Flex>
      ) : null}
    </Flex>
  );
}
