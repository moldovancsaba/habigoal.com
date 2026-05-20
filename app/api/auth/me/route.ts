import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { env } from "@/config/env";
import { getPrimaryRole, normalizeRoles } from "@/lib/access";

export async function GET() {
  if (!env.habigoalEnforceAuth) {
    return NextResponse.json({
      user: {
        userId: "hg-open-mode",
        email: "dev@habigoal.local",
        name: "Habigoal Dev",
        role: "admin,trainer,athlete",
        primaryRole: "admin",
        teamIds: []
      }
    });
  }

  const session = await getSession();
  if (!session?.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { findUserByEmail } = await import("@/repositories/user.repository");
  const user = await findUserByEmail(session.email);

  return NextResponse.json({
    user: {
      ...session,
      name: user?.name || session.name,
      role: user?.roles?.join(",") || session.role,
      primaryRole: getPrimaryRole(user?.roles || normalizeRoles(session.role.split(","))),
      athleteId: user?.athleteId,
      teamIds: user?.teamIds || []
    }
  });
}
