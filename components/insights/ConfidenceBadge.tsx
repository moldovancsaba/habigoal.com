"use client";

import { Badge, Tooltip } from "@sovereignsquad/gds/client";
import { useTranslations } from "next-intl";
import type { ConfidenceBand, ConfidenceReasonKey } from "@/lib/data-confidence";
import { getProductColor } from "@/lib/product-ui-contracts";

const BAND_COLOR: Record<ConfidenceBand, string> = {
  high: getProductColor("dashboard", "success"),
  medium: getProductColor("dashboard", "warning"),
  low: getProductColor("dashboard", "risk"),
  none: getProductColor("dashboard", "neutral"),
};

// Renders the canonical data-confidence band (GH-253) with its reasons in a
// tooltip, so every surface explains "how trustworthy is this?" honestly instead
// of just showing a colour. Pass the result of classifyDataConfidence.
export function ConfidenceBadge({
  band,
  reasonKeys = [],
  size = "sm",
}: {
  band: ConfidenceBand;
  reasonKeys?: ConfidenceReasonKey[];
  size?: string;
}) {
  const t = useTranslations("DataConfidence");
  const label = t(`band.${band}`);
  const reasons = reasonKeys.map((key) => t(`reasons.${key}`));
  const tooltip = reasons.length > 0 ? `${label} — ${reasons.join(" · ")}` : label;

  return (
    <Tooltip label={tooltip} multiline w={260} withArrow>
      <Badge color={BAND_COLOR[band]} variant="light" size={size} aria-label={tooltip}>
        {label}
      </Badge>
    </Tooltip>
  );
}
