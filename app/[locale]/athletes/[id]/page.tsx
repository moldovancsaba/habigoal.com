import { redirect } from "next/navigation";

export default async function AthleteAppProfilePage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/athlete-iq?persona=athlete#progress`);
}
