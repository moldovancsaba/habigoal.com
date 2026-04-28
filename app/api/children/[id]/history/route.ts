import { NextResponse } from "next/server";
import { getChildById } from "@/repositories/child.repository";
import { listAssessmentsByChildId } from "@/repositories/assessment.repository";
import { ObjectId } from "mongodb";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }
    const childId = new ObjectId(id);
    const child = await getChildById(childId);
    if (!child) {
      return NextResponse.json({ error: "Child not found" }, { status: 404 });
    }
    
    const assessments = await listAssessmentsByChildId(id);
    return NextResponse.json({ child, assessments });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
