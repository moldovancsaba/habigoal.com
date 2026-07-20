import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getAuthUser } from "@/lib/access";
import { projectEntitlementsForSurface } from "@/lib/product-entitlements";
import type { ProductSurfaceId } from "@/lib/product-entitlements";

export async function GET(request: Request) {
  const session = await getSession();
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Scope the entitlement view to the surface the client is ACTIVELY on (passed
  // as ?surface=), not the surface the session signed in through. With single
  // sign-on, a professional user (session productSurface=athlete-iq) can open the
  // consumer Habigoal route, whose shell calls this endpoint — keying off the
  // login surface would still hand the consumer client the Athlete IQ projection
  // (GH-432). Default to the most restrictive (consumer) projection when no surface
  // is declared.
  const requestedSurface = new URL(request.url).searchParams.get("surface");
  const activeSurface: ProductSurfaceId = requestedSurface === "athlete-iq" ? "athlete-iq" : "habigoal";

  return NextResponse.json({
    user: {
      userId: session?.userId ?? user.id ?? user.email,
      email: session?.email ?? user.email,
      name: user.name || session?.name || user.email,
      expires: session?.expires,
      productSurface: session?.productSurface,
      role: user.primaryRole,
      roles: user.roles,
      primaryRole: user.primaryRole,
      athleteId: user.athleteId,
      productEntitlements: projectEntitlementsForSurface(user.productEntitlements, activeSurface),
      teamIds: user.teamIds
    }
  });
}
