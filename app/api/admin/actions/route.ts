import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { jsonError, readJson, requireRole } from "@/lib/api";
import { getAuthUser } from "@/lib/access";
import { findUserByEmail, setUserRoles } from "@/repositories/user.repository";
import { insertAuditEvent } from "@/repositories/audit-event.repository";
import { validateGovAction, computeNextRoles } from "@/lib/admin-actions";

// Policy-safe admin governance actions (#152): admin-only, validated against the
// shared contract, audit-first (the change is recorded before it is applied; if
// the audit write fails the mutation is aborted), and role-grant/revoke is the
// only supported mutation — both backed by the real user store.
export async function POST(request: Request) {
  const authError = await requireRole(request, ["admin"]);
  if (authError) return authError;

  const actor = await getAuthUser();
  if (!actor) return jsonError("Authentication required", 401, "AUTH_REQUIRED");

  const validation = validateGovAction(await readJson(request));
  if (!validation.ok) {
    return jsonError(`Invalid ${validation.field}`, 400, "VALIDATION_ERROR");
  }
  const { userEmail, action, scope, reason } = validation.value;

  const target = await findUserByEmail(userEmail);
  if (!target) return jsonError("Target user not found", 404, "NOT_FOUND");

  const rolesBefore = target.roles;
  const rolesAfter = computeNextRoles(rolesBefore, action, scope);

  // Audit-first: if we cannot record the governance action, do not apply it.
  try {
    await insertAuditEvent({
      eventId: randomUUID(),
      organisationId: "default",
      actorEmail: actor.email,
      actorRole: actor.primaryRole,
      action: "admin.governance",
      resourceType: "user",
      resourceId: userEmail,
      metadata: { govAction: action, scope, reason, rolesBefore, rolesAfter },
      createdAt: new Date().toISOString(),
    });
  } catch {
    return jsonError("Audit write failed; governance action aborted", 502, "AUDIT_WRITE_FAILED");
  }

  await setUserRoles(userEmail, rolesAfter);

  return NextResponse.json({ ok: true, userEmail, action, scope, roles: rolesAfter });
}
