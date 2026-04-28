import { NextResponse } from "next/server";
import { createAssessmentFromPayload, listAssessments } from "@/services/assessment.service";

export async function GET() {
  try {
    return NextResponse.json(await listAssessments());
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const assessment = await createAssessmentFromPayload(await request.json().catch(() => null));
    return NextResponse.json({ assessment }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
