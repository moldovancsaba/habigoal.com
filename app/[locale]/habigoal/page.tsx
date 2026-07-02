import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import DashboardShell from "@/components/layout/DashboardShell";
import { HabigoalExperience } from "@/components/product/habigoal/HabigoalExperience";
import { requireProductSession } from "@/lib/product-session";
import { getProductSurfaceOrThrow } from "@/lib/product-surfaces";
import { getHabigoalRecentHistory, getHabigoalTodayProjection } from "@/services/habigoal-product.service";

export const dynamic = "force-dynamic";

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
  await requireProductSession({
    allowedRoles: ["admin", "athlete", "trainer", "parent", "performance_coach", "physio", "analyst", "club_management"],
    locale,
    path: `/${locale}/habigoal`,
    persona: "athlete",
    surface: "habigoal"
  });
  const [projection, history] = await Promise.all([getHabigoalTodayProjection(), getHabigoalRecentHistory()]);

  // Render inside the single shared shell so there is exactly one persona menu
  // (the DashboardShell nav). The Habigoal experience renders in `embedded`
  // mode, suppressing its own duplicate top bar / mobile header / bottom nav.
  return (
    <DashboardShell>
      <HabigoalExperience projection={projection} history={history} surface={getProductSurfaceOrThrow("habigoal")} embedded />
    </DashboardShell>
  );
}
