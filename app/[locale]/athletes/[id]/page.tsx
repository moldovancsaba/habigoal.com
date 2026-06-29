import DashboardShell from "@/components/layout/DashboardShell";
import { OnboardingProvider } from "@/components/onboarding/OnboardingPrompt";
import AthleteHistoryPage from "@/app/[locale]/dashboard/athletes/[id]/page";

// An athlete's own profile/history surface. It is reachable from the athlete
// persona menu (DashboardShell "Progress"), so it must render inside the same
// shared shell — otherwise the single persona menu disappears on this page.
// The distraction-free check-in shells under /athletes/[id]/check-in and
// /athletes/checkin are separate routes and intentionally stay unwrapped.
export default function AthleteAppProfilePage(props: { params: Promise<{ id: string; locale: string }> }) {
  return (
    <DashboardShell>
      <OnboardingProvider>
        <AthleteHistoryPage {...props} />
      </OnboardingProvider>
    </DashboardShell>
  );
}
