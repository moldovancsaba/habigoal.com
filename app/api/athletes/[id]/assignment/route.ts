import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { jsonError, readJson, requireRole } from "@/lib/api";
import { canAccessAthlete, getAuthUser } from "@/lib/access";
import { getChildById, updateChildById } from "@/repositories/child.repository";
import { logAuditEvent } from "@/lib/audit";

function stringValue(value: unknown, max = 240): string {
  return typeof value === "string" ? value.slice(0, max).trim() : "";
}

function stringArray(value: unknown, maxItems = 20): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string").map((s) => s.trim()).filter(Boolean).slice(0, maxItems);
}

const STATUSES = new Set(["active", "injured", "unavailable", "trialist", "archived"]);

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireRole(request, ["admin", "trainer", "performance_coach"]);
  if (authError) return authError;

  const { id } = await params;
  if (!ObjectId.isValid(id)) return jsonError("Invalid ID", 400, "VALIDATION_ERROR");

  const authUser = await getAuthUser();
  if (authUser && !(await canAccessAthlete(authUser, id))) {
    return jsonError("Forbidden", 403, "FORBIDDEN");
  }

  const existing = await getChildById(new ObjectId(id));
  if (!existing) return jsonError("Athlete not found", 404, "NOT_FOUND");

  const body = (await readJson(request)) as Record<string, unknown> | null;
  if (!body) return jsonError("Invalid payload", 400, "VALIDATION_ERROR");

  const statusRaw = stringValue(body.status, 40);
  const status = STATUSES.has(statusRaw) ? (statusRaw as typeof existing.status) : existing.status;

  const seasonEntry = stringValue(body.season, 40);
  const seasonHistory = seasonEntry
    ? [...(existing.seasonHistory ?? []).filter((s) => s.season !== seasonEntry), { season: seasonEntry, teamId: stringValue(body.teamId, 120) || existing.teamId }]
    : existing.seasonHistory;

  const customAttributes =
    body.customAttributes && typeof body.customAttributes === "object"
      ? { ...(existing.customAttributes ?? {}), ...(body.customAttributes as Record<string, string | number | boolean>) }
      : existing.customAttributes;

  const updated = await updateChildById(new ObjectId(id), {
    surveyId: existing.surveyId,
    name: existing.name,
    birthDate: existing.birthDate,
    organisationId: existing.organisationId,
    teamId: stringValue(body.teamId, 120) || existing.teamId,
    position: stringValue(body.position, 80) || existing.position,
    status,
    parentGuardianUserId: stringValue(body.parentGuardianUserId, 120) || existing.parentGuardianUserId,
    parentGuardianEmail: stringValue(body.parentGuardianEmail, 240) || existing.parentGuardianEmail,
    injuryHistoryFlags: body.injuryHistoryFlags ? stringArray(body.injuryHistoryFlags) : existing.injuryHistoryFlags,
    customAttributes,
    seasonHistory,
    baselineProfile: existing.baselineProfile,
    consentPhoto: existing.consentPhoto ?? false,
    consentReport: existing.consentReport ?? false,
    dominantHand: existing.dominantHand ?? "",
    dominantEye: existing.dominantEye ?? "",
    dominantFoot: existing.dominantFoot ?? "",
    knownTraits: existing.knownTraits ?? "",
    parentSignals: existing.parentSignals ?? "",
    locale: existing.locale,
  });

  if (authUser) {
    await logAuditEvent({
      actorEmail: authUser.email,
      actorRole: authUser.primaryRole,
      action: "athlete.update",
      resourceType: "athlete_assignment",
      resourceId: id,
      metadata: { teamId: updated?.teamId, status: updated?.status },
    });
  }

  return NextResponse.json(updated);
}
