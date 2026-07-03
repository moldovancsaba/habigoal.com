"use client";

import { StateBlock } from "@sovereignsquad/gds/client";
import { useTranslations } from "next-intl";

// Honest "not available yet" state (GH-440). Render this wherever a capability is
// off — never a fabricated value. Optional title/description override the
// localized defaults for surface-specific copy.
export function NotAvailableYet({ title, description }: { title?: string; description?: string }) {
  const t = useTranslations("Common");
  return (
    <StateBlock
      variant="info"
      title={title ?? t("featureUnavailableTitle")}
      description={description ?? t("featureUnavailableBody")}
    />
  );
}
