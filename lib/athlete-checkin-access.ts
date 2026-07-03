import type { AuthUser } from "@/lib/access";

// Access + redirect rules for the dedicated athlete-first check-in shell (GH-156).
// Pure so the role/redirect logic is unit-testable independently of the route.
export type CheckinShellAccess =
  | { ok: true; athleteId: string }
  | { ok: false; redirectTo: string };

// Only an athlete with a resolved athlete profile may use the shell. Non-athletes
// (trainer/admin/parent) are sent to the dashboard; an athlete without a linked
// profile is sent to the app home. A multi-role user that includes "athlete" and
// has an athleteId is allowed.
export function resolveCheckinShellAccess(user: AuthUser | null): CheckinShellAccess {
  if (!user) return { ok: false, redirectTo: "/" };
  if (!user.roles.includes("athlete")) return { ok: false, redirectTo: "/dashboard" };
  if (!user.athleteId) return { ok: false, redirectTo: "/" };
  return { ok: true, athleteId: user.athleteId };
}
