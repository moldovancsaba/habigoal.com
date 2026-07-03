"use client";

import { StateBlock as GdsStateBlock } from "@sovereignsquad/gds/client";
import type { ReactNode } from "react";

type StateBlockProps = {
  title: string;
  body: string;
  action?: ReactNode;
};

export function StateBlock({ title, body, action }: StateBlockProps) {
  return <GdsStateBlock variant="info" title={title} description={body} action={action} compact />;
}
