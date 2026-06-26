import { OnboardingProvider } from "@/components/onboarding/OnboardingPrompt";
import AthleteHistoryPage from "@/app/[locale]/dashboard/athletes/[id]/page";

export default function AthleteAppProfilePage(props: { params: Promise<{ id: string; locale: string }> }) {
  return (
    <OnboardingProvider>
      <AthleteHistoryPage {...props} />
    </OnboardingProvider>
  );
}
