import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { env } from "@/config/env";
import { getAuthUser } from "@/lib/access";
import { projectEntitlementsForSurface } from "@/lib/product-entitlements";
import type { ProductSurfaceId } from "@/lib/product-entitlements";

export async function GET(request: Request) {
  if (!env.habigoalEnforceAuth) {
    return NextResponse.json({
      user: {
        userId: "hg-open-mode",
        email: "dev@habigoal.local",
        name: "Habigoal Dev",
        role: "admin",
        roles: ["admin", "trainer", "athlete"],
        primaryRole: "admin",
        productEntitlements: {
          habigoal: { enabled: true, reason: "admin_grant" },
          athleteIq: { enabled: true, reason: "admin_grant" }
        },
        teamIds: []
      }
    });
  }

  const session = await getSession();
  if (!session?.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

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
      ...session,
      name: user.name || session.name,
      role: user.primaryRole,
      roles: user.roles,
      primaryRole: user.primaryRole,
      athleteId: user.athleteId,
      productEntitlements: projectEntitlementsForSurface(user.productEntitlements, activeSurface),
      teamIds: user.teamIds
    }
  });
}
