import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { HabigoalExperience } from "@/components/product/habigoal/HabigoalExperience";
import { getProductSurfaceOrThrow } from "@/lib/product-surfaces";

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ProductSurfaces.habigoal.metadata" });

  return {
    title: t("title"),
    description: t("description")
  };
}

export default async function HabigoalSurfaceRoute({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <HabigoalExperience surface={getProductSurfaceOrThrow("habigoal")} />;
}
