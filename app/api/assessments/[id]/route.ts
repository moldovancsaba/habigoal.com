import { NextResponse } from "next/server";
import {
  getAssessment,
  parseObjectId,
  removeAssessment,
  updateAssessmentFromPayload
} from "@/services/assessment.service";
import { jsonError, readJson, requireRole } from "@/lib/api";

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function objectIdFromContext(context: RouteContext) {
  const { id } = await context.params;
  return parseObjectId(id);
}

export async function GET(_request: Request, context: RouteContext) {
  const authError = requireRole(_request, ["admin", "conductor", "observer"]);
  if (authError) return authError;

  const _id = await objectIdFromContext(context);
  if (!_id) {
    return jsonError("Invalid assessment id", 400, "VALIDATION_ERROR");
  }

  try {
    const assessment = await getAssessment(_id);
    if (!assessment) {
      return jsonError("Assessment not found", 404, "NOT_FOUND");
    }

    return NextResponse.json({ assessment });
  } catch (error) {
    return jsonError((error as Error).message);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const authError = requireRole(request, ["admin", "conductor"]);
  if (authError) return authError;

  const _id = await objectIdFromContext(context);
  if (!_id) {
    return jsonError("Invalid assessment id", 400, "VALIDATION_ERROR");
  }

  try {
    const assessment = await updateAssessmentFromPayload(_id, await readJson(request));
    if (!assessment) {
      return jsonError("Assessment not found", 404, "NOT_FOUND");
    }

    return NextResponse.json({ assessment });
  } catch (error) {
    return jsonError((error as Error).message);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const authError = requireRole(_request, ["admin"]);
  if (authError) return authError;

  const _id = await objectIdFromContext(context);
  if (!_id) {
    return jsonError("Invalid assessment id", 400, "VALIDATION_ERROR");
  }

  try {
    await removeAssessment(_id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError((error as Error).message);
  }
}
