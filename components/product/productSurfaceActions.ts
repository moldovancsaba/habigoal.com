"use client";

import { createGdsVocabularyPack, GdsIcons } from "@sovereignsquad/gds/client";

export type ProductSurfaceActionMessages = Partial<Record<"dashboard" | "athleteDashboard" | "reset" | "complete" | "acknowledge" | "report" | "launch", string>>;

export function createProductSurfaceActionPack(messages: ProductSurfaceActionMessages = {}) {
  return createGdsVocabularyPack("productSurface", {
    dashboard: { defaultMessage: messages.dashboard ?? "Open dashboard", icon: GdsIcons.Dashboard },
    athleteDashboard: { defaultMessage: messages.athleteDashboard ?? "Open Athlete IQ dashboard", icon: GdsIcons.Dashboard },
    reset: { defaultMessage: messages.reset ?? "Reset values", icon: GdsIcons.Restore },
    complete: { defaultMessage: messages.complete ?? "Complete action", icon: GdsIcons.Check },
    acknowledge: { defaultMessage: messages.acknowledge ?? "Acknowledge", icon: GdsIcons.Check },
    report: { defaultMessage: messages.report ?? "Open report", icon: GdsIcons.Eye },
    launch: { defaultMessage: messages.launch ?? "Launch module", icon: GdsIcons.Launch }
  });
}

export type ProductSurfaceActionPack = ReturnType<typeof createProductSurfaceActionPack>;
