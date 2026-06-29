import {
  GOV_ACTIONS,
  GOV_ASSIGNABLE_ROLES,
  type GovAction,
  type GovActionPayload,
  type GovAssignableRole
} from "@/types/admin-action";
import type { AppRole } from "@/lib/access";

export type GovValidation =
  | { ok: true; value: GovActionPayload }
  | { ok: false; field: string; code: "REQUIRED" | "INVALID" };

export function isGovAction(value: unknown): value is GovAction {
  return typeof value === "string" && (GOV_ACTIONS as readonly string[]).includes(value);
}

export function isGovAssignableRole(value: unknown): value is GovAssignableRole {
  return typeof value === "string" && (GOV_ASSIGNABLE_ROLES as readonly string[]).includes(value);
}

// Pure validation of a governance action payload. A non-trivial reason is
// mandatory because every governance change is audited.
export function validateGovAction(body: unknown): GovValidation {
  const b = (body ?? {}) as Record<string, unknown>;

  const userEmail = typeof b.userEmail === "string" ? b.userEmail.trim().toLowerCase() : "";
  if (!userEmail) return { ok: false, field: "userEmail", code: "REQUIRED" };

  if (!isGovAction(b.action)) return { ok: false, field: "action", code: "INVALID" };
  if (!isGovAssignableRole(b.scope)) return { ok: false, field: "scope", code: "INVALID" };

  const reason = typeof b.reason === "string" ? b.reason.trim() : "";
  if (reason.length < 3) return { ok: false, field: "reason", code: "REQUIRED" };

  return { ok: true, value: { userEmail, action: b.action, scope: b.scope, reason } };
}

// Deterministic, idempotent role transition. Granting an existing role or
// revoking an absent one leaves the role set unchanged.
export function computeNextRoles(
  currentRoles: AppRole[],
  action: GovAction,
  role: GovAssignableRole
): AppRole[] {
  const set = new Set<AppRole>(currentRoles);
  if (action === "grant_role") set.add(role);
  else set.delete(role);
  return Array.from(set);
}
