"use client";

import { AthleteIqExperience } from "./athlete-iq/AthleteIqExperience";
import { HabigoalExperience } from "./habigoal/HabigoalExperience";
import type { ProductSurface } from "@/lib/product-surfaces";
import type { AthleteIqProductDashboardProjection } from "@/services/athleteiq-product-dashboard.service";

type ProductSurfacePageProps = {
  athleteIqDashboard?: AthleteIqProductDashboardProjection;
  surface: ProductSurface;
  relatedSurface?: ProductSurface;
};

export function ProductSurfacePage({ athleteIqDashboard, surface, relatedSurface }: ProductSurfacePageProps) {
  if (surface.id === "habigoal") {
    return <HabigoalExperience relatedSurface={relatedSurface} surface={surface} />;
  }

  if (!athleteIqDashboard) return null;
  return <AthleteIqExperience dashboard={athleteIqDashboard} relatedSurface={relatedSurface} surface={surface} />;
}
