import { redirect } from "next/navigation";

// The real athlete experience lives at the localized `/athlete-iq` surface.
// This legacy route previously rendered a hardcoded mock (static readiness score
// and a placeholder radar); redirect to the live surface so there is a single
// source of truth for the athlete view.
export default function AthletePortalPage() {
  redirect("/athlete-iq");
}
