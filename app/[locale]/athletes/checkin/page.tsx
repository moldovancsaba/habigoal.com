import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getAuthUser } from "@/lib/access";
import { resolveCheckinShellAccess } from "@/lib/athlete-checkin-access";
import { AthleteCheckInApp } from "@/components/forms/AthleteCheckInApp";
import { OnboardingProvider } from "@/components/onboarding/OnboardingPrompt";

// Dedicated athlete-first check-in shell (#156). Self-resolves the signed-in
// athlete's identity and enforces the athlete role, so this surface stays free of
// trainer/admin controls. The legacy per-id route (/athletes/[id]/check-in)
// remains operational for coach/admin flows.
export default async function AthleteCheckinShellPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const access = resolveCheckinShellAccess(await getAuthUser());
  if (!access.ok) redirect(`/${locale}${access.redirectTo}`);

  return (
    <OnboardingProvider>
      <AthleteCheckInApp forcedChildId={access.athleteId} profileReturnHref={`/athletes/${access.athleteId}`} />
    </OnboardingProvider>
  );
}
