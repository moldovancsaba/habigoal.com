"use client";

import { Box } from "@mantine/core";

export function PageContainer({ children }: { children: React.ReactNode }) {
  return (
    <Box
      style={{
        width: "100%",
        maxWidth: 1600,
        marginInline: "auto"
      }}
      px={{ base: "md", md: "lg" }}
    >
      {children}
    </Box>
  );
}
