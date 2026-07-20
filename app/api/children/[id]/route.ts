import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { jsonError, readJson, requireRole } from "@/lib/api";
import { canAccessAthlete, getAuthUser } from "@/lib/access";
import { parseChildPayload } from "@/lib/validations";
import { deleteAssessmentsForChild, updateAssessmentsForChildProfile } from "@/repositories/assessment.repository";
import { deleteChildById, getChildById, updateChildById } from "@/repositories/child.repository";
import { filterAthleteProfileForRoles } from "@/lib/athlete-field-access";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authError = await requireRole(_request, ["admin", "trainer", "athlete", "parent", "performance_coach", "physio", "analyst"]);
  if (authError) return authError;

  try {
    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return jsonError("Invalid ID", 400, "VALIDATION_ERROR");
    }
    const authUser = await getAuthUser({ productSurface: "athlete-iq" });
    if (!authUser) return jsonError("Athlete IQ access required", 403, "PRODUCT_ACCESS_DENIED");
    if (!(await canAccessAthlete(authUser, id))) {
      return jsonError("Insufficient permissions", 403, "FORBIDDEN");
    }

    const child = await getChildById(new ObjectId(id));
    if (!child) {
      return jsonError("Child not found", 404, "NOT_FOUND");
    }

    const filtered = filterAthleteProfileForRoles(child, authUser.roles);

    return NextResponse.json(filtered);
  } catch (error) {
    return jsonError((error as Error).message);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authError = await requireRole(request, ["admin", "trainer"]);
  if (authError) return authError;

  try {
    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return jsonError("Invalid ID", 400, "VALIDATION_ERROR");
    }
    const authUser = await getAuthUser({ productSurface: "athlete-iq" });
    if (!authUser) return jsonError("Athlete IQ access required", 403, "PRODUCT_ACCESS_DENIED");
    if (!(await canAccessAthlete(authUser, id))) {
      return jsonError("Insufficient permissions", 403, "FORBIDDEN");
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
  const authError = await requireRole(request, ["admin", "trainer"]);
  if (authError) return authError;

  try {
    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return jsonError("Invalid ID", 400, "VALIDATION_ERROR");
    }
    const authUser = await getAuthUser({ productSurface: "athlete-iq" });
    if (!authUser) return jsonError("Athlete IQ access required", 403, "PRODUCT_ACCESS_DENIED");
    if (!(await canAccessAthlete(authUser, id))) {
      return jsonError("Insufficient permissions", 403, "FORBIDDEN");
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
