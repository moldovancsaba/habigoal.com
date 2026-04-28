import { NextResponse } from "next/server";
import { getChildById } from "@/repositories/child.repository";
import { listAssessmentsByChildId } from "@/repositories/assessment.repository";
import { ObjectId } from "mongodb";
import { jsonError } from "@/lib/api";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return jsonError("Invalid ID", 400, "VALIDATION_ERROR");
    }
    const childId = new ObjectId(id);
    const child = await getChildById(childId);
    if (!child) {
      return jsonError("Child not found", 404, "NOT_FOUND");
    }
    
    const assessments = await listAssessmentsByChildId(id);
    return NextResponse.json({ child, assessments });
  } catch (error) {
    return jsonError((error as Error).message);
  }
}
