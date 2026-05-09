import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export async function GET() {
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
