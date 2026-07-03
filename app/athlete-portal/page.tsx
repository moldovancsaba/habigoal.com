import { redirect } from "next/navigation";

// Legacy, non-localized route that previously rendered a hardcoded athlete mock.
// It must not push everyone unconditionally into the professional `/athlete-iq`
// surface (a product-boundary leak, GH-432) — and a non-localized target bypasses
// the locale middleware anyway. Redirect to the root so the locale middleware
// routes to the localized landing/selector, where the visitor chooses a surface.
export default function AthletePortalPage() {
  redirect("/");
}
