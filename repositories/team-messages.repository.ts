import { getDatabase } from "@/lib/mongodb";
import { toJsonId } from "@/lib/utils";

export type TeamMessageRecord = {
  id?: string;
  teamId: string;
  recipientId: string;
  text: string;
  senderEmail: string;
  senderName: string;
  createdAt: string;
};

const collectionName = "team_messages";

function normalizeTeamMessage(record: Record<string, unknown>) {
  return toJsonId(record) as unknown as TeamMessageRecord;
}

export async function insertTeamMessage(input: Omit<TeamMessageRecord, "id" | "createdAt">) {
  const db = await getDatabase();
  const createdAt = new Date().toISOString();
  const result = await db.collection(collectionName).insertOne({ ...input, createdAt });
  return normalizeTeamMessage({ ...input, createdAt, _id: result.insertedId.toString() });
}
