import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { canAccessAthlete, getAuthUser } from "@/lib/access";
import { jsonError, readJson, requireRole } from "@/lib/api";
import { getFmsHistory, submitFmsScreen } from "@/services/athleteiq-fms.service";

const WRITE_ROLES = ["admin", "trainer", "performance_coach", "physio"];

// GET /api/athletes/[id]/fms?from=&to= — FMS history for the athlete. Readable
// by staff with access and by the athlete themselves (own health record).
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authError = await requireRole(request, [...WRITE_ROLES, "athlete"]);
  if (authError) return authError;

  try {
    const { id } = await params;
    if (!ObjectId.isValid(id)) return jsonError("Invalid ID", 400, "VALIDATION_ERROR");

    const authUser = await getAuthUser();
    if (!authUser || !(await canAccessAthlete(authUser, id))) {
      return jsonError("Insufficient permissions", 403, "FORBIDDEN");
    }

    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from")?.trim() || undefined;
    const to = searchParams.get("to")?.trim() || undefined;

    const screens = await getFmsHistory({ athleteId: id, from, to });
    console.info(JSON.stringify({ event: "injury.fms.viewed", athleteId: id, count: screens.length }));
    return NextResponse.json({ screens });
  } catch (error) {
    return jsonError((error as Error).message);
  }
}

// POST /api/athletes/[id]/fms — persist an FMS screen (composite computed
// server-side). Staff-only write; idempotent per (athlete, date).
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authError = await requireRole(request, WRITE_ROLES);
  if (authError) return authError;

  try {
    const { id } = await params;
    if (!ObjectId.isValid(id)) return jsonError("Invalid ID", 400, "VALIDATION_ERROR");

    const authUser = await getAuthUser();
    if (!authUser || !(await canAccessAthlete(authUser, id))) {
      return jsonError("Insufficient permissions", 403, "FORBIDDEN");
    }

    const body = (await readJson(request)) as Record<string, unknown> | null;
    const date = typeof body?.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.date)
      ? body.date
      : new Date().toISOString().slice(0, 10);

    const { errors, screen } = await submitFmsScreen({
      athleteId: id,
      date,
      scores: body?.scores,
      painFlags: body?.painFlags,
      notes: body?.notes,
      recordedBy: authUser.email
    });
    if (errors.length || !screen) return jsonError(errors.join("; ") || "Invalid FMS submission", 400, "VALIDATION_ERROR");

    console.info(JSON.stringify({ event: "injury.fms.submitted", athleteId: id, composite: screen.composite }));
    return NextResponse.json({ screen });
  } catch (error) {
    return jsonError((error as Error).message);
  }
}
