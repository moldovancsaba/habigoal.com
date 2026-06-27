import { redirect } from "next/navigation";
import { canOpenProductSurface, getAuthUser, normalizeRoles, type AppRole } from "@/lib/access";
import { getSession } from "@/lib/session";
import type { ProductSurfaceId } from "@/lib/product-entitlements";

export type ProductLoginPersona = "athlete" | "trainer";

export async function requireProductSession(input: {
  allowedRoles: AppRole[];
  locale: string;
  path: string;
  persona: ProductLoginPersona;
  surface: ProductSurfaceId;
}) {
  const session = await getSession();
  const user = await getAuthUser();
  const activeRoles = normalizeRoles(session?.role?.split(",") ?? []);
  const hasAllowedRole = input.allowedRoles.some((role) => activeRoles.includes(role));

  if (!session?.email || !user || !hasAllowedRole) {
    redirect(`/${input.locale}/login?next=${encodeURIComponent(input.path)}&persona=${input.persona}`);
  }

  if (!canOpenProductSurface(user, input.surface)) {
    const error = input.surface === "athlete-iq" ? "athlete_iq_access_required" : "habigoal_access_required";
    redirect(`/${input.locale}/login?next=${encodeURIComponent(input.path)}&persona=${input.persona}&error=${error}`);
  }
}
