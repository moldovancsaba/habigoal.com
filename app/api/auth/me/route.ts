import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { env } from "@/config/env";

export async function GET() {
  if (!env.surveyEnforceAuth) {
    return NextResponse.json({
      user: {
        userId: "hg-open-mode",
        email: "dev@habigoal.local",
        name: "Habigoal Dev",
        role: "admin,conductor,observer"
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
      role: user?.roles?.join(",") || session.role
    }
  });
}
