import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AthleteIqExperience } from "@/components/product/athlete-iq/AthleteIqExperience";
import { getProductAppContract, getProductAppSessionInput, resolveAthleteIqProductAppId } from "@/lib/product-apps";
import { requireProductSession } from "@/lib/product-session";
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
  params,
  searchParams
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ persona?: string }>;
}) {
  const { locale } = await params;
  const { persona } = await searchParams;
  setRequestLocale(locale);
  // The persona pre-selected on the selector decides which AIQ experience to
  // render (athlete vs trainer); the projection gates it against real roles.
  const requestedPersona = persona === "athlete" || persona === "trainer" ? persona : undefined;
  const appContract = getProductAppContract(resolveAthleteIqProductAppId(requestedPersona));
  await requireProductSession(getProductAppSessionInput(appContract, locale, { persona: requestedPersona }));
  const dashboard = await getAthleteIqProductDashboardProjection({ requestedPersona });

  return (
    <AthleteIqExperience
      appContract={appContract}
      dashboard={dashboard}
      surface={getProductSurfaceOrThrow(appContract.productSurfaceId)}
    />
  );
}
