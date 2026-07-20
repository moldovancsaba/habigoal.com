import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { canAccessAthlete, getAuthUser } from "@/lib/access";
import { jsonError, readJson, requireRole } from "@/lib/api";
import { buildTrainingLoadSummary, getMondayDate, getWeekEndDate, parseTrainingLoadInput, validateTrainingLoadInput } from "@/lib/training-load";
import { getChildById } from "@/repositories/child.repository";
import { createTrainingLoadRecord, listTrainingLoadRecordsByAthleteId } from "@/repositories/training-load.repository";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authError = await requireRole(request, ["admin", "trainer", "athlete"]);
  if (authError) return authError;

  try {
    const { id } = await params;
    if (!ObjectId.isValid(id)) return jsonError("Invalid athlete ID", 400, "VALIDATION_ERROR");
    const authUser = await getAuthUser({ productSurface: "athlete-iq" });
    if (authUser && !(await canAccessAthlete(authUser, id))) {
      return jsonError("Insufficient permissions", 403, "FORBIDDEN");
    }
    const athlete = await getChildById(new ObjectId(id));
    if (!athlete) return jsonError("Athlete not found", 404, "NOT_FOUND");

    const { searchParams } = new URL(request.url);
    const weekStart = getMondayDate(searchParams.get("weekStart") || new Date().toISOString().slice(0, 10));
    const from = searchParams.get("from") || weekStart;
    const to = searchParams.get("to") || getWeekEndDate(weekStart);
    const records = await listTrainingLoadRecordsByAthleteId({ athleteId: id, from, to });

    return NextResponse.json({
      records,
      summary: buildTrainingLoadSummary(records, weekStart)
    });
  } catch (error) {
    return jsonError((error as Error).message);
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authError = await requireRole(request, ["admin", "trainer", "athlete"]);
  if (authError) return authError;

  try {
    const { id } = await params;
    if (!ObjectId.isValid(id)) return jsonError("Invalid athlete ID", 400, "VALIDATION_ERROR");
    const authUser = await getAuthUser({ productSurface: "athlete-iq" });
    if (authUser && !(await canAccessAthlete(authUser, id))) {
      return jsonError("Insufficient permissions", 403, "FORBIDDEN");
    }
    const athlete = await getChildById(new ObjectId(id));
    if (!athlete) return jsonError("Athlete not found", 404, "NOT_FOUND");

    const parsed = parseTrainingLoadInput((await readJson(request)) as Record<string, unknown> | null);
    const validationError = validateTrainingLoadInput(parsed);
    if (validationError || parsed.durationMinutes === null || parsed.loadPoints === null) {
      return jsonError(validationError || "Invalid training load input.", 400, "VALIDATION_ERROR");
    }

    const record = await createTrainingLoadRecord({
      athleteId: id,
      date: parsed.date,
      source: parsed.source,
      activityTypes: parsed.activityTypes,
      durationMinutes: parsed.durationMinutes,
      rpe: parsed.rpe,
      loadPoints: parsed.loadPoints,
      note: parsed.note || undefined,
      createdBy: authUser?.email || "unknown"
    });

    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    return jsonError((error as Error).message);
  }
}
