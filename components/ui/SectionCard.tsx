"use client";

import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import type { SxProps, Theme } from "@mui/material/styles";
import type { ReactNode } from "react";

type SectionCardProps = {
  title?: string;
  subheader?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  sx?: SxProps<Theme>;
  contentSx?: SxProps<Theme>;
};

export function SectionCard({ title, subheader, action, children, className, sx, contentSx }: SectionCardProps) {
  return (
    <Card className={className} sx={{ mb: 2, ...sx }}>
      {(title || action) && (
        <CardHeader title={title} subheader={subheader} action={action} sx={{ pb: 0 }} />
      )}
      <CardContent sx={contentSx}>{children}</CardContent>
    </Card>
  );
}
