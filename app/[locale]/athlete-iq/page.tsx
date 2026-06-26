import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AthleteIqExperience } from "@/components/product/athlete-iq/AthleteIqExperience";
import { getProductSurfaceOrThrow } from "@/lib/product-surfaces";
import { getAthleteIqProductDashboardProjection } from "@/services/athleteiq-product-dashboard.service";

export const dynamic = "force-dynamic";

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
  const dashboard = await getAthleteIqProductDashboardProjection();

  return <AthleteIqExperience dashboard={dashboard} surface={getProductSurfaceOrThrow("athlete-iq")} />;
}
