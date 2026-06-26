import { setRequestLocale } from "next-intl/server";
import { AthleteCheckInApp } from "@/components/forms/AthleteCheckInApp";
import { OnboardingProvider } from "@/components/onboarding/OnboardingPrompt";

export default async function AthleteCheckInPage({ params }: { params: Promise<{ id: string; locale: string }> }) {
  const { id, locale } = await params;
  setRequestLocale(locale);

  return (
    <OnboardingProvider>
      <AthleteCheckInApp forcedChildId={id} profileReturnHref={`/athletes/${id}`} />
    </OnboardingProvider>
  );
}
