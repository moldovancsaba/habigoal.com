import { redirect } from "next/navigation";

export default async function RpeLoggerPage({
  params
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/athlete-iq?persona=athlete#sessions`);
}
