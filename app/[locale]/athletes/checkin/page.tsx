import { redirect } from "next/navigation";

export default async function AthleteCheckinShellPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/habigoal`);
}
