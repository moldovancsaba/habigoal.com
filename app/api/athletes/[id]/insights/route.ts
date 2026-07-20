import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { jsonError, requireRole } from "@/lib/api";
import { canAccessAthlete, getAuthUser } from "@/lib/access";
import { getAthleteInsights } from "@/services/athlete-insights.service";

// Source-linked deterministic guidance signals (#81). Read-only and recomputed
// on request from canonical twin + habit data; athlete-scoped.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authError = await requireRole(request, ["admin", "trainer", "athlete"]);
  if (authError) return authError;

  try {
    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return jsonError("Invalid athlete ID", 400, "VALIDATION_ERROR");
    }
    const authUser = await getAuthUser({ productSurface: "athlete-iq" });
    if (authUser && !(await canAccessAthlete(authUser, id))) {
      return jsonError("Insufficient permissions", 403, "FORBIDDEN");
    }

    return NextResponse.json(await getAthleteInsights(id, { now: Date.now() }));
  } catch (error) {
    return jsonError((error as Error).message);
  }
}
