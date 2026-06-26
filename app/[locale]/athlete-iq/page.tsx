import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AthleteIqExperience } from "@/components/product/athlete-iq/AthleteIqExperience";
import { getProductSurfaceOrThrow } from "@/lib/product-surfaces";

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ProductSurfaces.athleteIq.metadata" });

  return {
    title: t("title"),
    description: t("description")
  };
}

export default async function AthleteIqSurfaceRoute({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <AthleteIqExperience surface={getProductSurfaceOrThrow("athlete-iq")} />;
}
