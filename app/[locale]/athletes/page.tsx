import { redirect } from "next/navigation";

export default async function AthletesAppPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/athlete-iq?persona=athlete`);
}
