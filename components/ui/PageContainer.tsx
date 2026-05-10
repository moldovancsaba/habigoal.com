"use client";

import { Box } from "@mantine/core";
import { APP_LAYOUT } from "@/theme/tokens";

export function PageContainer({ children }: { children: React.ReactNode }) {
  return (
    <Box
      className="surface-outline"
      style={{
        width: "100%",
        maxWidth: APP_LAYOUT.pageMaxWidth,
        marginInline: "auto"
      }}
      px={{ base: APP_LAYOUT.pageGutterMobile, sm: APP_LAYOUT.pageGutterTablet, md: APP_LAYOUT.pageGutterDesktop }}
      pt={{ base: 8, sm: 24 }}
    >
      {children}
    </Box>
  );
}
