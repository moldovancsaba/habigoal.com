import { NextResponse } from "next/server";
import { createAssessmentFromPayload, listAssessments, listDeletedAssessments } from "@/services/assessment.service";
import { jsonError, readJson, requireRole } from "@/lib/api";
import { canAccessAthlete, getAuthUser, resolveAccessibleAthleteIds } from "@/lib/access";
import { parseAssessmentPayload } from "@/lib/validations";

export async function GET(request: Request) {
  const authError = await requireRole(request, ["admin", "trainer"]);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    if (searchParams.get("deleted") === "true") {
      return NextResponse.json(await listDeletedAssessments());
    }
    const authUser = await getAuthUser();
    const result = await listAssessments();
    const allowedIds = authUser ? await resolveAccessibleAthleteIds(authUser) : null;
    return NextResponse.json(allowedIds === null ? result : {
      ...result,
      assessments: result.assessments.filter((assessment) => assessment.childId && allowedIds.includes(assessment.childId))
    });
  } catch (error) {
    return jsonError((error as Error).message);
  }
}

export async function POST(request: Request) {
  const authError = await requireRole(request, ["admin", "trainer", "athlete"]);
  if (authError) return authError;

  try {
    const payloadInput = await readJson(request);
    const payload = parseAssessmentPayload(payloadInput);
    const authUser = await getAuthUser();
    if (authUser?.primaryRole === "athlete") {
      if (!payload.childId || !(await canAccessAthlete(authUser, payload.childId))) {
        return jsonError("Insufficient permissions", 403, "FORBIDDEN");
      }
    }
    const assessment = await createAssessmentFromPayload(payload);
    return NextResponse.json({ assessment }, { status: 201 });
  } catch (error) {
    return jsonError((error as Error).message);
  }
}
