"use client";

import { AthleteIqExperience } from "./athlete-iq/AthleteIqExperience";
import { HabigoalExperience } from "./habigoal/HabigoalExperience";
import type { ProductSurface } from "@/lib/product-surfaces";
import type { AthleteIqProductDashboardProjection } from "@/services/athleteiq-product-dashboard.service";
import type { HabigoalTodayProjection } from "@/services/habigoal-product.service";

type ProductSurfacePageProps = {
  athleteIqDashboard?: AthleteIqProductDashboardProjection;
  habigoalProjection?: HabigoalTodayProjection;
  surface: ProductSurface;
  relatedSurface?: ProductSurface;
};

export function ProductSurfacePage({ athleteIqDashboard, habigoalProjection, surface, relatedSurface }: ProductSurfacePageProps) {
  if (surface.id === "habigoal") {
    return <HabigoalExperience projection={habigoalProjection ?? emptyHabigoalProjection()} relatedSurface={relatedSurface} surface={surface} />;
  }

  if (!athleteIqDashboard) return null;
  return <AthleteIqExperience dashboard={athleteIqDashboard} relatedSurface={relatedSurface} surface={surface} />;
}

function emptyHabigoalProjection(): HabigoalTodayProjection {
  const localDate = new Date().toISOString().slice(0, 10);
  return {
    athleteId: null,
    athleteName: null,
    completedHabits: [],
    confidence: "none",
    correlationId: "hbg-empty-client-fallback",
    dataState: "missing_profile",
    hasLiveCheckIn: false,
    hasLiveHabits: false,
    localDate,
    missingSignals: ["profile", "energy", "soreness", "mood", "sleep", "habits"],
    nextActionKey: "needs_input",
    reasonCodes: ["missing_profile"],
    score: null,
    source: "authenticated-empty",
    status: "needs_input",
    timezone: "UTC",
    values: {
      energy: null,
      soreness: null,
      mood: null,
      sleep: null
    }
  };
}
