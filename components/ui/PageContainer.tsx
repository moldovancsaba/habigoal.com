"use client";

import Box from "@mui/material/Box";

export function PageContainer({ children }: { children: React.ReactNode }) {
  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: 1600,
        mx: "auto",
        px: { xs: 1.5, sm: 2, md: 2.5 }
      }}
    >
      {children}
    </Box>
  );
}
