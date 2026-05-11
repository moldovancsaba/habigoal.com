import { NextResponse } from "next/server";
import { createAssessmentFromPayload, listAssessments, listDeletedAssessments } from "@/services/assessment.service";
import { jsonError, readJson, requireRole } from "@/lib/api";

export async function GET(request: Request) {
  const authError = await requireRole(request, ["admin", "conductor", "observer"]);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    if (searchParams.get("deleted") === "true") {
      return NextResponse.json(await listDeletedAssessments());
    }
    return NextResponse.json(await listAssessments());
  } catch (error) {
    return jsonError((error as Error).message);
  }
}

export async function POST(request: Request) {
  const authError = await requireRole(request, ["admin", "conductor"]);
  if (authError) return authError;

  try {
    const assessment = await createAssessmentFromPayload(await readJson(request));
    return NextResponse.json({ assessment }, { status: 201 });
  } catch (error) {
    return jsonError((error as Error).message);
  }
}
