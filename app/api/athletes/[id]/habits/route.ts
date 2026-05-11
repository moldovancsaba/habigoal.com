import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { jsonError, readJson, requireRole } from "@/lib/api";
import { normalizeHabitStatuses } from "@/lib/athlete-habits";
import { getChildById } from "@/repositories/child.repository";
import { listHabitRecordsByAthleteId, upsertHabitRecord } from "@/repositories/habit-records.repository";

function stringValue(value: unknown, max = 80) {
  return typeof value === "string" ? value.slice(0, max).trim() : "";
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authError = requireRole(request, ["admin", "conductor", "observer"]);
  if (authError) return authError;

  try {
    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return jsonError("Invalid athlete ID", 400, "VALIDATION_ERROR");
    }

    const athlete = await getChildById(new ObjectId(id));
    if (!athlete) {
      return jsonError("Athlete not found", 404, "NOT_FOUND");
    }

    const records = await listHabitRecordsByAthleteId(id);
    return NextResponse.json({ records });
  } catch (error) {
    return jsonError((error as Error).message);
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authError = requireRole(request, ["admin", "conductor", "observer"]);
  if (authError) return authError;

  try {
    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return jsonError("Invalid athlete ID", 400, "VALIDATION_ERROR");
    }

    const athlete = await getChildById(new ObjectId(id));
    if (!athlete) {
      return jsonError("Athlete not found", 404, "NOT_FOUND");
    }

    const body = (await readJson(request)) as Record<string, unknown> | null;
    const date = stringValue(body?.date) || new Date().toISOString().slice(0, 10);
    const statuses = normalizeHabitStatuses(body?.statuses as Record<string, unknown> | undefined);

    const record = await upsertHabitRecord({
      athleteId: id,
      date,
      statuses
    });

    return NextResponse.json(record);
  } catch (error) {
    return jsonError((error as Error).message);
  }
}
