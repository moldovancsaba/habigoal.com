"use client";

import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import type { ReactNode } from "react";

type SectionCardProps = {
  title?: string;
  subheader?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function SectionCard({ title, subheader, action, children, className }: SectionCardProps) {
  return (
    <Card className={className} sx={{ mb: 2 }}>
      {(title || action) && (
        <CardHeader title={title} subheader={subheader} action={action} sx={{ pb: 0 }} />
      )}
      <CardContent>{children}</CardContent>
    </Card>
  );
}
