import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { env } from "@/config/env";
import { getAuthUser } from "@/lib/access";

export async function GET() {
  if (!env.habigoalEnforceAuth) {
    return NextResponse.json({
      user: {
        userId: "hg-open-mode",
        email: "dev@habigoal.local",
        name: "Habigoal Dev",
        role: "admin",
        roles: ["admin", "trainer", "athlete"],
        primaryRole: "admin",
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

  return NextResponse.json({
    user: {
      ...session,
      name: user.name || session.name,
      role: user.primaryRole,
      roles: user.roles,
      primaryRole: user.primaryRole,
      athleteId: user.athleteId,
      teamIds: user.teamIds
    }
  });
}
