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
    localDate,
    timezone: "UTC",
    values: {
      energy: 0,
      soreness: 0,
      mood: 0,
      sleep: 0
    },
    completedHabits: [],
    hasLiveCheckIn: false,
    hasLiveHabits: false
  };
}
