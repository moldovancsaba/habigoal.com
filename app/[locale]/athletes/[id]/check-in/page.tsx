import { setRequestLocale } from "next-intl/server";
import { AthleteCheckInApp } from "@/components/forms/AthleteCheckInApp";

export default async function AthleteCheckInPage({ params }: { params: Promise<{ id: string; locale: string }> }) {
  const { id, locale } = await params;
  setRequestLocale(locale);

  return <AthleteCheckInApp forcedChildId={id} profileReturnHref={`/athletes/${id}`} />;
}
