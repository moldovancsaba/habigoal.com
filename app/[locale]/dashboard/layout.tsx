import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import DashboardShell from "@/components/layout/DashboardShell";

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Dashboard" });

  return {
    title: {
      default: t("brandName"),
      template: `%s · ${t("brandName")}`
    },
    description: t("brandSubtitle")
  };
}

export default function DashboardLayout({
  children
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  return <DashboardShell>{children}</DashboardShell>;
}
