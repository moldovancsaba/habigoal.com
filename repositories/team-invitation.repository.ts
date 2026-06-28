import { ObjectId } from "mongodb";
import { getDatabase } from "@/lib/mongodb";
import { toJsonId } from "@/lib/utils";
import type { TeamInvitation, TeamInvitationRole, TeamInvitationStatus } from "@/types/team-invitation";

const collectionName = "team_invitations";

function normalize(doc: Record<string, unknown>): TeamInvitation {
  const json = toJsonId(doc) as Record<string, unknown>;
  return {
    _id: typeof json._id === "string" ? json._id : undefined,
    teamId: typeof json.teamId === "string" ? json.teamId : "",
    teamName: typeof json.teamName === "string" ? json.teamName : "",
    email: typeof json.email === "string" ? json.email : "",
    role: (json.role === "trainer" ? "trainer" : "athlete") as TeamInvitationRole,
    status: ((["pending", "accepted", "revoked"].includes(json.status as string) ? json.status : "pending") as TeamInvitationStatus),
    token: typeof json.token === "string" ? json.token : "",
    invitedByEmail: typeof json.invitedByEmail === "string" ? json.invitedByEmail : "",
    invitedByName: typeof json.invitedByName === "string" ? json.invitedByName : undefined,
    createdAt: typeof json.createdAt === "string" ? json.createdAt : new Date().toISOString(),
    updatedAt: typeof json.updatedAt === "string" ? json.updatedAt : new Date().toISOString(),
    acceptedAt: typeof json.acceptedAt === "string" ? json.acceptedAt : undefined
  };
}

export async function insertInvitation(invitation: Omit<TeamInvitation, "_id">): Promise<TeamInvitation> {
  const db = await getDatabase();
  const result = await db.collection(collectionName).insertOne({ ...invitation });
  return { _id: result.insertedId.toString(), ...invitation };
}

export async function findPendingInvitation(teamId: string, email: string, role: TeamInvitationRole): Promise<TeamInvitation | null> {
  const db = await getDatabase();
  const doc = await db.collection(collectionName).findOne({ teamId, email: email.toLowerCase().trim(), role, status: "pending" });
  return doc ? normalize(doc as Record<string, unknown>) : null;
}

export async function listInvitationsByTeam(teamId: string): Promise<TeamInvitation[]> {
  const db = await getDatabase();
  const docs = await db.collection(collectionName).find({ teamId }).sort({ createdAt: -1 }).toArray();
  return docs.map((doc) => normalize(doc as Record<string, unknown>));
}

export async function listPendingInvitationsByEmail(email: string): Promise<TeamInvitation[]> {
  const db = await getDatabase();
  const docs = await db.collection(collectionName).find({ email: email.toLowerCase().trim(), status: "pending" }).sort({ createdAt: -1 }).toArray();
  return docs.map((doc) => normalize(doc as Record<string, unknown>));
}

export async function getInvitationById(id: string): Promise<TeamInvitation | null> {
  if (!ObjectId.isValid(id)) return null;
  const db = await getDatabase();
  const doc = await db.collection(collectionName).findOne({ _id: new ObjectId(id) });
  return doc ? normalize(doc as Record<string, unknown>) : null;
}

export async function updateInvitationStatus(id: string, status: TeamInvitationStatus): Promise<TeamInvitation | null> {
  if (!ObjectId.isValid(id)) return null;
  const db = await getDatabase();
  const update: Record<string, unknown> = { status, updatedAt: new Date().toISOString() };
  if (status === "accepted") update.acceptedAt = new Date().toISOString();
  const result = await db.collection(collectionName).findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: update },
    { returnDocument: "after" }
  );
  return result ? normalize(result as Record<string, unknown>) : null;
}
