"use client";

import { createGdsVocabularyPack, GdsIcons } from "@doneisbetter/gds/client";

export function createProductSurfaceActionPack() {
  return createGdsVocabularyPack("productSurface", {
    dashboard: { defaultMessage: "Open dashboard", icon: GdsIcons.Dashboard },
    athleteDashboard: { defaultMessage: "Open Athlete IQ dashboard", icon: GdsIcons.Dashboard },
    reset: { defaultMessage: "Reset demo", icon: GdsIcons.Restore },
    complete: { defaultMessage: "Complete action", icon: GdsIcons.Check },
    acknowledge: { defaultMessage: "Acknowledge", icon: GdsIcons.Check },
    report: { defaultMessage: "Open report", icon: GdsIcons.Eye },
    launch: { defaultMessage: "Launch module", icon: GdsIcons.Launch }
  });
}

export type ProductSurfaceActionPack = ReturnType<typeof createProductSurfaceActionPack>;
