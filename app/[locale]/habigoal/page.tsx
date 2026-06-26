import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { ProductSurfacePage } from "@/components/product/ProductSurfacePage";
import { getProductSurfaceOrThrow } from "@/lib/product-surfaces";

export const metadata: Metadata = {
  title: "Habigoal | Simple habit and wellbeing support",
  description: "Habigoal is the simple client wellbeing, habit tracking, sport support, and status feedback surface."
};

export default async function HabigoalSurfaceRoute({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <ProductSurfacePage surface={getProductSurfaceOrThrow("habigoal")} />;
}
