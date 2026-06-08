import type { AppRole } from "@/lib/access";

export type ExtendedRole =
  | AppRole
  | "parent"
  | "performance_coach"
  | "physio"
  | "analyst"
  | "club_management";

export type Capability =
  | "athlete:read"
  | "athlete:write"
  | "athlete:status"
  | "athlete:injury_flags"
  | "athlete:medical_notes"
  | "checkin:read"
  | "checkin:write"
  | "checkin:configure"
  | "twin:read"
  | "twin:write"
  | "recommendation:read"
  | "recommendation:override"
  | "report:read"
  | "report:export"
  | "consent:manage"
  | "audit:read"
  | "privacy:export"
  | "privacy:erase"
  | "device:manage"
  | "settings:admin"
  | "queue:admin";

const roleCapabilities: Record<ExtendedRole, Capability[]> = {
  admin: [
    "athlete:read", "athlete:write", "athlete:status", "athlete:injury_flags", "athlete:medical_notes",
    "checkin:read", "checkin:write", "checkin:configure", "twin:read", "twin:write",
    "recommendation:read", "recommendation:override", "report:read", "report:export",
    "consent:manage", "audit:read", "privacy:export", "privacy:erase", "device:manage",
    "settings:admin", "queue:admin",
  ],
  trainer: [
    "athlete:read", "athlete:write", "athlete:status", "athlete:injury_flags",
    "checkin:read", "checkin:write", "twin:read", "recommendation:read", "recommendation:override",
    "report:read", "report:export", "device:manage",
  ],
  athlete: ["athlete:read", "checkin:read", "checkin:write", "twin:read", "recommendation:read", "device:manage"],
  parent: ["athlete:read", "checkin:read", "twin:read", "report:read", "consent:manage"],
  performance_coach: [
    "athlete:read", "athlete:status", "checkin:read", "twin:read", "recommendation:read",
    "report:read", "report:export", "device:manage",
  ],
  physio: [
    "athlete:read", "athlete:injury_flags", "athlete:medical_notes", "checkin:read",
    "twin:read", "recommendation:read", "report:read",
  ],
  analyst: ["athlete:read", "checkin:read", "twin:read", "report:read", "report:export"],
  club_management: [
    "athlete:read", "checkin:read", "twin:read", "recommendation:read", "report:read", "report:export", "audit:read",
  ],
};

const extendedRoleAliases: Record<string, ExtendedRole> = {
  admin: "admin",
  trainer: "trainer",
  coach: "trainer",
  conductor: "trainer",
  athlete: "athlete",
  observer: "athlete",
  parent: "parent",
  guardian: "parent",
  performance_coach: "performance_coach",
  physio: "physio",
  physiotherapist: "physio",
  analyst: "analyst",
  club_management: "club_management",
  management: "club_management",
};

export function normalizeExtendedRole(role: string): ExtendedRole | null {
  return extendedRoleAliases[role.trim().toLowerCase()] ?? null;
}

export function normalizeExtendedRoles(roles: string[] | undefined | null): ExtendedRole[] {
  return Array.from(
    new Set((roles || []).map(normalizeExtendedRole).filter((r): r is ExtendedRole => Boolean(r)))
  );
}

export function hasCapability(roles: string[] | undefined | null, capability: Capability): boolean {
  const normalized = normalizeExtendedRoles(roles);
  return normalized.some((role) => roleCapabilities[role]?.includes(capability));
}

export function canViewInjuryFlags(roles: string[] | undefined | null): boolean {
  return hasCapability(roles, "athlete:injury_flags");
}

export function canViewMedicalNotes(roles: string[] | undefined | null): boolean {
  return hasCapability(roles, "athlete:medical_notes");
}
