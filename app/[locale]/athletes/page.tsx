import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getAuthUser } from "@/lib/access";
import { AthletesAppHome } from "@/components/athletes/AthletesAppHome";

export default async function AthletesAppPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const authUser = await getAuthUser();

  if (authUser?.primaryRole === "athlete") {
    if (authUser.athleteId) {
      redirect(`/${locale}/athletes/${authUser.athleteId}`);
    }
    redirect(`/${locale}`);
  }

  if (authUser?.primaryRole === "trainer" || authUser?.primaryRole === "admin") {
    redirect(`/${locale}/dashboard/athletes`);
  }

  return <AthletesAppHome />;
}
