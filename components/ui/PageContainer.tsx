"use client";

import { Box } from "@mantine/core";

export function PageContainer({ children }: { children: React.ReactNode }) {
  return (
    <Box
      className="surface-outline"
      style={{
        width: "100%",
        maxWidth: 1600,
        marginInline: "auto",
        paddingTop: 24
      }}
      px={{ base: "md", md: "lg" }}
    >
      {children}
    </Box>
  );
}
