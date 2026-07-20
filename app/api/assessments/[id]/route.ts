import { NextResponse } from "next/server";
import { canAccessAthlete, getAuthUser } from "@/lib/access";
import {
  getAssessment,
  parseObjectId,
  removeAssessment,
  restoreAssessment,
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
  const authError = await requireRole(_request, ["admin", "trainer", "athlete"]);
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
    const authUser = await getAuthUser({ productSurface: "athlete-iq" });
    if (authUser && (!assessment.childId || !(await canAccessAthlete(authUser, assessment.childId)))) {
      return jsonError("Insufficient permissions", 403, "FORBIDDEN");
    }

    return NextResponse.json({ assessment });
  } catch (error) {
    return jsonError((error as Error).message);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const authError = await requireRole(request, ["admin", "trainer"]);
  if (authError) return authError;

  const _id = await objectIdFromContext(context);
  if (!_id) {
    return jsonError("Invalid assessment id", 400, "VALIDATION_ERROR");
  }

  try {
    const existing = await getAssessment(_id);
    const authUser = await getAuthUser({ productSurface: "athlete-iq" });
    if (existing) {
      if (authUser && (!existing.childId || !(await canAccessAthlete(authUser, existing.childId)))) {
        return jsonError("Insufficient permissions", 403, "FORBIDDEN");
      }
    }
    const assessment = await updateAssessmentFromPayload(_id, await readJson(request), {
      actor: authUser ? { email: authUser.email, name: authUser.name, role: authUser.primaryRole } : undefined
    });
    if (!assessment) {
      return jsonError("Assessment not found", 404, "NOT_FOUND");
    }

    return NextResponse.json({ assessment });
  } catch (error) {
    return jsonError((error as Error).message);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const authError = await requireRole(_request, ["admin", "trainer"]);
  if (authError) return authError;

  const _id = await objectIdFromContext(context);
  if (!_id) {
    return jsonError("Invalid assessment id", 400, "VALIDATION_ERROR");
  }

  try {
    const assessment = await getAssessment(_id);
    if (assessment) {
      const authUser = await getAuthUser({ productSurface: "athlete-iq" });
      if (authUser && (!assessment.childId || !(await canAccessAthlete(authUser, assessment.childId)))) {
        return jsonError("Insufficient permissions", 403, "FORBIDDEN");
      }
    }
    await removeAssessment(_id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError((error as Error).message);
  }
}

export async function POST(_request: Request, context: RouteContext) {
  const authError = await requireRole(_request, ["admin", "trainer"]);
  if (authError) return authError;
  const _id = await objectIdFromContext(context);
  if (!_id) {
    return jsonError("Invalid assessment id", 400, "VALIDATION_ERROR");
  }
  try {
    const assessment = await getAssessment(_id);
    if (assessment) {
      const authUser = await getAuthUser({ productSurface: "athlete-iq" });
      if (authUser && (!assessment.childId || !(await canAccessAthlete(authUser, assessment.childId)))) {
        return jsonError("Insufficient permissions", 403, "FORBIDDEN");
      }
    }
    await restoreAssessment(_id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError((error as Error).message);
  }
}
