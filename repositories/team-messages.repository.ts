import { getDatabase } from "@/lib/mongodb";

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

function normalizeTeamMessage(record: Record<string, unknown>): TeamMessageRecord {
  const id = record._id != null ? String(record._id) : typeof record.id === "string" ? record.id : undefined;
  return {
    id,
    teamId: String(record.teamId ?? ""),
    recipientId: String(record.recipientId ?? ""),
    text: String(record.text ?? ""),
    senderEmail: String(record.senderEmail ?? ""),
    senderName: String(record.senderName ?? ""),
    createdAt: String(record.createdAt ?? ""),
  };
}

export async function insertTeamMessage(input: Omit<TeamMessageRecord, "id" | "createdAt">) {
  const db = await getDatabase();
  const createdAt = new Date().toISOString();
  const result = await db.collection(collectionName).insertOne({ ...input, createdAt });
  return normalizeTeamMessage({ ...input, createdAt, _id: result.insertedId.toString() });
}

// Read path for team messages (newest first), optionally scoped to a recipient
// athlete and cursor-paginated by createdAt (`before`). Bounded page size.
export async function listTeamMessages(
  teamId: string,
  options: { recipientId?: string; limit?: number; before?: string } = {}
): Promise<TeamMessageRecord[]> {
  const db = await getDatabase();
  const filter: Record<string, unknown> = { teamId };
  if (options.recipientId) filter.recipientId = options.recipientId;
  if (options.before) filter.createdAt = { $lt: options.before };
  const limit = Math.min(Math.max(options.limit ?? 30, 1), 100);
  const rows = await db
    .collection(collectionName)
    .find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
  return rows.map((row) => normalizeTeamMessage(row as Record<string, unknown>));
}
