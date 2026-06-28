import { randomUUID } from "crypto";
import type { AuthUser } from "@/lib/access";
import { addAthleteToTeam, addTrainerToTeam, getTeamById } from "@/repositories/team.repository";
import {
  findPendingInvitation,
  getInvitationById,
  insertInvitation,
  listInvitationsByTeam,
  listPendingInvitationsByEmail,
  updateInvitationStatus
} from "@/repositories/team-invitation.repository";
import type { Team } from "@/types/team";
import type { TeamInvitation, TeamInvitationRole } from "@/types/team-invitation";

export class InvitationError extends Error {
  status: number;
  code: string;
  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = "InvitationError";
    this.status = status;
    this.code = code;
  }
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// A trainer/club manager owns a team when their email is on it or the team is
// assigned to them; admins manage every team.
export function canManageTeam(actor: AuthUser, team: Team): boolean {
  if (actor.primaryRole === "admin") return true;
  const manageRoles = new Set(["trainer", "performance_coach", "club_management"]);
  if (!actor.roles.some((role) => manageRoles.has(role))) return false;
  const email = actor.email.toLowerCase().trim();
  if (team.trainerEmails.map((value) => value.toLowerCase()).includes(email)) return true;
  return Boolean(team._id && actor.teamIds.includes(team._id));
}

export async function createTeamInvitation(input: {
  actor: AuthUser;
  teamId: string;
  email: string;
  role: TeamInvitationRole;
}): Promise<TeamInvitation> {
  const email = input.email.toLowerCase().trim();
  if (!EMAIL_PATTERN.test(email)) {
    throw new InvitationError("A valid email is required", 400, "INVALID_EMAIL");
  }
  const role: TeamInvitationRole = input.role === "trainer" ? "trainer" : "athlete";

  const team = await getTeamById(input.teamId);
  if (!team) throw new InvitationError("Team not found", 404, "TEAM_NOT_FOUND");
  if (!canManageTeam(input.actor, team)) {
    throw new InvitationError("You cannot manage this team", 403, "FORBIDDEN");
  }

  if (role === "trainer" && team.trainerEmails.map((value) => value.toLowerCase()).includes(email)) {
    throw new InvitationError("This trainer is already on the team", 409, "ALREADY_MEMBER");
  }

  // Idempotent: reuse an existing pending invitation for the same target.
  const existing = await findPendingInvitation(team._id ?? input.teamId, email, role);
  if (existing) return existing;

  const now = new Date().toISOString();
  return insertInvitation({
    teamId: team._id ?? input.teamId,
    teamName: team.name,
    email,
    role,
    status: "pending",
    token: randomUUID(),
    invitedByEmail: input.actor.email,
    invitedByName: input.actor.name,
    createdAt: now,
    updatedAt: now
  });
}

export async function acceptTeamInvitation(input: { actor: AuthUser; invitationId: string }): Promise<TeamInvitation> {
  const invitation = await getInvitationById(input.invitationId);
  if (!invitation) throw new InvitationError("Invitation not found", 404, "NOT_FOUND");
  if (invitation.status !== "pending") {
    throw new InvitationError("Invitation is no longer pending", 409, "NOT_PENDING");
  }
  if (invitation.email.toLowerCase() !== input.actor.email.toLowerCase()) {
    throw new InvitationError("This invitation belongs to another account", 403, "FORBIDDEN");
  }

  if (invitation.role === "trainer") {
    await addTrainerToTeam(invitation.teamId, input.actor.email);
  } else {
    if (!input.actor.athleteId) {
      throw new InvitationError("Create your athlete profile before joining a team", 409, "ATHLETE_PROFILE_REQUIRED");
    }
    await addAthleteToTeam(invitation.teamId, input.actor.athleteId);
  }

  const updated = await updateInvitationStatus(invitation._id ?? input.invitationId, "accepted");
  return updated ?? { ...invitation, status: "accepted" };
}

export async function revokeTeamInvitation(input: { actor: AuthUser; invitationId: string }): Promise<TeamInvitation> {
  const invitation = await getInvitationById(input.invitationId);
  if (!invitation) throw new InvitationError("Invitation not found", 404, "NOT_FOUND");
  const team = await getTeamById(invitation.teamId);
  if (!team || !canManageTeam(input.actor, team)) {
    throw new InvitationError("You cannot manage this team", 403, "FORBIDDEN");
  }
  const updated = await updateInvitationStatus(invitation._id ?? input.invitationId, "revoked");
  return updated ?? { ...invitation, status: "revoked" };
}

export async function listMyPendingInvitations(email: string): Promise<TeamInvitation[]> {
  return listPendingInvitationsByEmail(email);
}

export async function listTeamInvitations(input: { actor: AuthUser; teamId: string }): Promise<TeamInvitation[]> {
  const team = await getTeamById(input.teamId);
  if (!team) throw new InvitationError("Team not found", 404, "TEAM_NOT_FOUND");
  if (!canManageTeam(input.actor, team)) {
    throw new InvitationError("You cannot manage this team", 403, "FORBIDDEN");
  }
  return listInvitationsByTeam(team._id ?? input.teamId);
}
