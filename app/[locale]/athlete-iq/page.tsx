import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { ProductSurfacePage } from "@/components/product/ProductSurfacePage";
import { getProductSurfaceOrThrow } from "@/lib/product-surfaces";

export const metadata: Metadata = {
  title: "Athlete IQ | Professional performance operating system",
  description: "Athlete IQ is the professional performance layer for athletes, coaches, academies, dashboards, and services."
};

export default async function AthleteIqSurfaceRoute({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <ProductSurfacePage
      surface={getProductSurfaceOrThrow("athlete-iq")}
      relatedSurface={getProductSurfaceOrThrow("habigoal")}
    />
  );
}
