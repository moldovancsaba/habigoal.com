"use client";

import { AthleteIqExperience } from "./athlete-iq/AthleteIqExperience";
import { HabigoalExperience } from "./habigoal/HabigoalExperience";
import type { ProductSurface } from "@/lib/product-surfaces";

type ProductSurfacePageProps = {
  surface: ProductSurface;
  relatedSurface?: ProductSurface;
};

export function ProductSurfacePage({ surface, relatedSurface }: ProductSurfacePageProps) {
  if (surface.id === "habigoal") {
    return <HabigoalExperience relatedSurface={relatedSurface} surface={surface} />;
  }

  return <AthleteIqExperience relatedSurface={relatedSurface} surface={surface} />;
}
