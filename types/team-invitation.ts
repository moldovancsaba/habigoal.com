export type TeamInvitationRole = "athlete" | "trainer";

export type TeamInvitationStatus = "pending" | "accepted" | "revoked";

export interface TeamInvitation {
  _id?: string;
  teamId: string;
  teamName: string;
  email: string;
  role: TeamInvitationRole;
  status: TeamInvitationStatus;
  token: string;
  invitedByEmail: string;
  invitedByName?: string;
  createdAt: string;
  updatedAt: string;
  acceptedAt?: string;
}
