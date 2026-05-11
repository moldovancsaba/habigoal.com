import { setRequestLocale } from "next-intl/server";
import { AthletesAppHome } from "@/components/athletes/AthletesAppHome";

export default async function AthletesAppPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <AthletesAppHome />;
}
