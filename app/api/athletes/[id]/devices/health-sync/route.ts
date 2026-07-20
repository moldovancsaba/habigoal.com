import { NextResponse } from "next/server";
import { canAccessAthleteIqAthlete, getAuthUser } from "@/lib/access";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getAuthUser({ productSurface: "athlete-iq" });
    if (!user) {
      return NextResponse.json({ error: "Authentication required", code: "AUTH_REQUIRED" }, { status: 401 });
    }
    if (!(await canAccessAthleteIqAthlete(user, id))) {
      return NextResponse.json({ error: "Insufficient permissions", code: "FORBIDDEN" }, { status: 403 });
    }

    return NextResponse.json({
      error: "Health sync ingest is disabled until a signed mobile ingest contract is configured.",
      code: "HEALTH_SYNC_DISABLED",
      retryable: false
    }, { status: 501 });
  } catch {
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
