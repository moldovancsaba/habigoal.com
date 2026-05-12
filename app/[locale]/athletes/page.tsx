import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { AthletesAppHome } from "@/components/athletes/AthletesAppHome";
import { env } from "@/config/env";
import { getAuthUser } from "@/lib/access";

export default async function AthletesAppPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  if (env.surveyEnforceAuth) {
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
  }

  return <AthletesAppHome />;
}
