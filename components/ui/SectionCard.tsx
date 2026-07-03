"use client";

import { Box } from "@mantine/core";
import { SectionPanel } from "@sovereignsquad/gds/client";
import type { CSSProperties, ReactNode } from "react";

type SectionCardProps = {
  title?: string;
  subheader?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  sx?: Record<string, unknown>;
  contentSx?: Record<string, unknown>;
};

function toStyleObject(input?: Record<string, unknown>, withDefaultMargin = false): CSSProperties {
  if (!input) {
    return withDefaultMargin ? { marginBottom: "1rem" } : {};
  }

  const { mb, ...rest } = input;
  const style = rest as CSSProperties;
  if (typeof mb === "number") {
    style.marginBottom = `${mb * 0.25}rem`;
  } else if (typeof mb === "string") {
    style.marginBottom = mb;
  } else if (withDefaultMargin) {
    style.marginBottom = "1rem";
  }
  return style;
}

export function SectionCard({ title, subheader, action, children, className, sx, contentSx }: SectionCardProps) {
  return (
    <Box className={className} style={toStyleObject(sx, true)}>
      <SectionPanel title={title} description={subheader} action={action}>
        <Box style={toStyleObject(contentSx)}>
          {children}
        </Box>
      </SectionPanel>
    </Box>
  );
}
