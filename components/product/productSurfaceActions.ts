"use client";

import { createGdsVocabularyPack, GdsIcons } from "@doneisbetter/gds/client";

export function createProductSurfaceActionPack() {
  return createGdsVocabularyPack("productSurface", {
    home: { defaultMessage: "Home", icon: GdsIcons.Back },
    dashboard: { defaultMessage: "Open dashboard", icon: GdsIcons.Dashboard },
    habigoal: { defaultMessage: "Open Habigoal", icon: GdsIcons.Profile },
    aiq: { defaultMessage: "Open Athlete IQ", icon: GdsIcons.Dashboard },
    reset: { defaultMessage: "Reset demo", icon: GdsIcons.Restore },
    complete: { defaultMessage: "Complete action", icon: GdsIcons.Check },
    acknowledge: { defaultMessage: "Acknowledge", icon: GdsIcons.Check },
    report: { defaultMessage: "Open report", icon: GdsIcons.Eye },
    launch: { defaultMessage: "Launch module", icon: GdsIcons.Launch }
  });
}

export type ProductSurfaceActionPack = ReturnType<typeof createProductSurfaceActionPack>;
