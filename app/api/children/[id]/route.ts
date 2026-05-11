import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { jsonError, readJson, requireRole } from "@/lib/api";
import { parseChildPayload } from "@/lib/validations";
import { deleteAssessmentsForChild, updateAssessmentsForChildProfile } from "@/repositories/assessment.repository";
import { deleteChildById, getChildById, updateChildById } from "@/repositories/child.repository";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authError = await requireRole(_request, ["admin", "conductor", "observer"]);
  if (authError) return authError;

  try {
    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return jsonError("Invalid ID", 400, "VALIDATION_ERROR");
    }

    const child = await getChildById(new ObjectId(id));
    if (!child) {
      return jsonError("Child not found", 404, "NOT_FOUND");
    }

    return NextResponse.json(child);
  } catch (error) {
    return jsonError((error as Error).message);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authError = await requireRole(request, ["admin", "conductor"]);
  if (authError) return authError;

  try {
    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return jsonError("Invalid ID", 400, "VALIDATION_ERROR");
    }

    const payload = parseChildPayload(await readJson(request));
    if (!payload.name || !payload.birthDate) {
      return jsonError("Child name and birthDate are required", 400, "VALIDATION_ERROR");
    }

    const child = await updateChildById(new ObjectId(id), payload);
    if (!child) {
      return jsonError("Child not found", 404, "NOT_FOUND");
    }

    await updateAssessmentsForChildProfile(id, {
      name: payload.name,
      birthDate: payload.birthDate,
      knownTraits: payload.knownTraits,
      parentSignals: payload.parentSignals,
      dominantHand: payload.dominantHand,
      dominantEye: payload.dominantEye,
      dominantFoot: payload.dominantFoot,
      consentPhoto: payload.consentPhoto,
      consentReport: payload.consentReport
    });

    return NextResponse.json(child);
  } catch (error) {
    return jsonError((error as Error).message);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authError = await requireRole(request, ["admin", "conductor"]);
  if (authError) return authError;

  try {
    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return jsonError("Invalid ID", 400, "VALIDATION_ERROR");
    }

    const child = await deleteChildById(new ObjectId(id));
    if (!child) {
      return jsonError("Child not found", 404, "NOT_FOUND");
    }

    await deleteAssessmentsForChild(id, {
      name: child.name,
      birthDate: child.birthDate
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return jsonError((error as Error).message);
  }
}
