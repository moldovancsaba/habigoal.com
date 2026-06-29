import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import DashboardShell from "@/components/layout/DashboardShell";
import { AthleteIqExperience } from "@/components/product/athlete-iq/AthleteIqExperience";
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
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireProductSession({
    allowedRoles: ["admin", "athlete", "trainer", "performance_coach", "physio", "analyst", "club_management"],
    locale,
    path: `/${locale}/athlete-iq`,
    persona: "trainer",
    surface: "athlete-iq"
  });
  const dashboard = await getAthleteIqProductDashboardProjection();

  // Render inside the single shared shell so there is exactly one persona menu
  // (the DashboardShell nav). The Athlete IQ experience renders in `embedded`
  // mode, suppressing its own duplicate top bars / drawer / sidebar.
  return (
    <DashboardShell>
      <AthleteIqExperience dashboard={dashboard} surface={getProductSurfaceOrThrow("athlete-iq")} embedded />
    </DashboardShell>
  );
}
