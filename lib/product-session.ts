import { redirect } from "next/navigation";
import { canOpenProductSurface, getAuthUser, normalizeRoles, type AppRole } from "@/lib/access";
import type { ProductAppPersona } from "@/lib/product-apps";
import { getSession } from "@/lib/session";
import type { ProductSurfaceId } from "@/lib/product-entitlements";

export type ProductLoginPersona = ProductAppPersona;

export async function requireProductSession(input: {
  allowedRoles: readonly AppRole[];
  locale: string;
  path: string;
  persona: ProductLoginPersona;
  surface: ProductSurfaceId;
}) {
  const session = await getSession();
  const user = await getAuthUser();

  if (!session?.email || !user) {
    redirect(`/${input.locale}/login?next=${encodeURIComponent(input.path)}&persona=${input.persona}`);
  }

  // Single sign-in across both products: authorize against the user's ACTUAL
  // roles, not the persona they happened to pick at login. Otherwise a trainer
  // (who is also an athlete) gets bounced back to the login screen when they open
  // Habigoal, and an athlete when they open Athlete IQ — i.e. "I'm logged in but
  // have to log in again for the other app". Entitlement is still enforced below.
  const userRoles = normalizeRoles(user.roles);
  const hasAllowedRole = input.allowedRoles.some((role) => userRoles.includes(role));
  if (!hasAllowedRole) {
    redirect(`/${input.locale}/login?next=${encodeURIComponent(input.path)}&persona=${input.persona}`);
  }

  if (!canOpenProductSurface(user, input.surface)) {
    const error = input.surface === "athlete-iq" ? "athlete_iq_access_required" : "habigoal_access_required";
    redirect(`/${input.locale}/login?next=${encodeURIComponent(input.path)}&persona=${input.persona}&error=${error}`);
  }
}
