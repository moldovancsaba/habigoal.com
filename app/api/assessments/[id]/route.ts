import { NextResponse } from "next/server";
import {
  getAssessment,
  parseObjectId,
  removeAssessment,
  updateAssessmentFromPayload
} from "@/services/assessment.service";

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function objectIdFromContext(context: RouteContext) {
  const { id } = await context.params;
  return parseObjectId(id);
}

export async function GET(_request: Request, context: RouteContext) {
  const _id = await objectIdFromContext(context);
  if (!_id) {
    return NextResponse.json({ error: "Invalid assessment id" }, { status: 400 });
  }

  try {
    const assessment = await getAssessment(_id);
    if (!assessment) {
      return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
    }

    return NextResponse.json({ assessment });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const _id = await objectIdFromContext(context);
  if (!_id) {
    return NextResponse.json({ error: "Invalid assessment id" }, { status: 400 });
  }

  try {
    const assessment = await updateAssessmentFromPayload(_id, await request.json().catch(() => null));
    if (!assessment) {
      return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
    }

    return NextResponse.json({ assessment });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const _id = await objectIdFromContext(context);
  if (!_id) {
    return NextResponse.json({ error: "Invalid assessment id" }, { status: 400 });
  }

  try {
    await removeAssessment(_id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
