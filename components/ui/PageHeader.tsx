"use client";

import { Box, Flex, Text, Title } from "@mantine/core";
import type { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
};

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <Flex
      gap="md"
      direction={{ base: "column", md: "row" }}
      justify="space-between"
      align={{ base: "stretch", md: "center" }}
    >
      <Box>
        <Title order={1} size="h2" fw={800}>
          {title}
        </Title>
        {subtitle ? (
          <Text c="dimmed" size="sm">
            {subtitle}
          </Text>
        ) : null}
      </Box>
      {actions ? (
        <Flex gap="sm" wrap={{ base: "wrap", md: "nowrap" }} justify={{ base: "flex-start", md: "flex-end" }}>
          {actions}
        </Flex>
      ) : null}
    </Flex>
  );
}
