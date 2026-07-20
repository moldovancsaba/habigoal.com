import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { canAccessAthlete, getAuthUser } from "@/lib/access";
import { jsonError, readJson, requireRole } from "@/lib/api";
import { computeLoadPoints } from "@/lib/training-load";
import { getChildById } from "@/repositories/child.repository";
import { createTrainingLoadRecord } from "@/repositories/training-load.repository";
import type { SessionRpeResult } from "@/types/training-plan";

export async function POST(request: Request) {
  const authError = await requireRole(request, ["admin", "trainer", "athlete"]);
  if (authError) return authError;

  try {
    const body = (await readJson(request)) as Record<string, unknown> | null;
    const sessionId = stringValue(body?.sessionId, 120);
    const athleteId = stringValue(body?.athleteId, 80);
    const rpeScore = numberValue(body?.rpeScore, 1, 10);
    const durationMinutes = numberValue(body?.durationMinutes, 1, 360);

    if (!sessionId || !ObjectId.isValid(athleteId) || rpeScore === null || durationMinutes === null) {
      return jsonError("Invalid RPE payload", 400, "VALIDATION_ERROR");
    }

    const authUser = await getAuthUser({ productSurface: "athlete-iq" });
    if (authUser && !(await canAccessAthlete(authUser, athleteId))) {
      return jsonError("Insufficient permissions", 403, "FORBIDDEN");
    }

    const athlete = await getChildById(new ObjectId(athleteId));
    if (!athlete) return jsonError("Athlete not found", 404, "NOT_FOUND");

    const completedLoadPoints = computeLoadPoints(durationMinutes, rpeScore);
    const record = await createTrainingLoadRecord({
      activityTypes: ["session"],
      athleteId,
      createdBy: authUser?.email || "unknown",
      date: localIsoDate(),
      durationMinutes,
      loadPoints: completedLoadPoints,
      note: `Session ${sessionId}`,
      rpe: rpeScore,
      source: "session_debrief"
    });

    const result: SessionRpeResult = {
      athleteId,
      completedLoadPoints,
      durationMinutes,
      recordedAt: record.createdAt,
      rpeScore,
      sessionId
    };

    return NextResponse.json({ record, result, success: true }, { status: 201 });
  } catch (error) {
    return jsonError((error as Error).message);
  }
}

function stringValue(value: unknown, max: number) {
  return typeof value === "string" ? value.slice(0, max).trim() : "";
}

function numberValue(value: unknown, min: number, max: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const rounded = Math.round(value);
  return rounded >= min && rounded <= max ? rounded : null;
}

function localIsoDate() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
