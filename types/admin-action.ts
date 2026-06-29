import type { AppRole } from "@/lib/access";

// Admin governance actions (#152). Bounded to role grant/revoke, the mutations
// the user store actually supports — no fabricated "suspend"/"flag" actions that
// have no backing field.
export const GOV_ACTIONS = ["grant_role", "revoke_role"] as const;
export type GovAction = (typeof GOV_ACTIONS)[number];

// Roles a governance action may assign or remove. "admin" is intentionally
// excluded so this surface can never self-escalate a user to admin or strip the
// last admin via the API.
export const GOV_ASSIGNABLE_ROLES = [
  "trainer",
  "athlete",
  "parent",
  "performance_coach",
  "physio",
  "analyst",
  "club_management"
] as const satisfies readonly AppRole[];

export type GovAssignableRole = (typeof GOV_ASSIGNABLE_ROLES)[number];

export type GovActionPayload = {
  userEmail: string;
  action: GovAction;
  scope: GovAssignableRole; // the role being granted or revoked
  reason: string;
};
