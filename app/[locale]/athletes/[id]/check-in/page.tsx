import { redirect } from "next/navigation";

export default async function AthleteCheckInPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/habigoal`);
}
