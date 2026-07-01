import { getDatabase } from "@/lib/mongodb";

export type TeamMessageRecord = {
  id?: string;
  teamId: string;
  recipientId: string;
  text: string;
  senderEmail: string;
  senderName: string;
  createdAt: string;
  // Shared across every per-recipient row from the same broadcast send, so the
  // UI can label them without a separate broadcast entity (#team-messaging-p1).
  broadcastId?: string;
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
    broadcastId: typeof record.broadcastId === "string" ? record.broadcastId : undefined,
  };
}

export async function insertTeamMessage(input: Omit<TeamMessageRecord, "id" | "createdAt">) {
  const db = await getDatabase();
  const createdAt = new Date().toISOString();
  const result = await db.collection(collectionName).insertOne({ ...input, createdAt });
  return normalizeTeamMessage({ ...input, createdAt, _id: result.insertedId.toString() });
}

// Fan out one message per athlete on the team, sharing a single broadcastId.
// Each recipient's copy is a normal TeamMessageRecord, so it shows up in their
// existing 1:1 thread — no separate broadcast read-path needed.
export async function insertTeamBroadcast(input: {
  teamId: string;
  athleteIds: string[];
  text: string;
  senderEmail: string;
  senderName: string;
}): Promise<TeamMessageRecord[]> {
  const broadcastId = crypto.randomUUID();
  return Promise.all(
    input.athleteIds.map((recipientId) =>
      insertTeamMessage({
        teamId: input.teamId,
        recipientId,
        text: input.text,
        senderEmail: input.senderEmail,
        senderName: input.senderName,
        broadcastId,
      })
    )
  );
}

// Escapes regex metacharacters so free-text search can't be abused as a regex
// injection / ReDoS vector.
function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Read path for team messages (newest first), optionally scoped to a recipient
// athlete and cursor-paginated by createdAt (`before`). Bounded page size.
// `search` does a case-insensitive substring match on the message text —
// omitting `recipientId` while searching lets a manager search across the
// whole team's threads at once.
export async function listTeamMessages(
  teamId: string,
  options: { recipientId?: string; limit?: number; before?: string; search?: string } = {}
): Promise<TeamMessageRecord[]> {
  const db = await getDatabase();
  const filter: Record<string, unknown> = { teamId };
  if (options.recipientId) filter.recipientId = options.recipientId;
  if (options.before) filter.createdAt = { $lt: options.before };
  if (options.search?.trim()) filter.text = { $regex: escapeRegex(options.search.trim()), $options: "i" };
  const limit = Math.min(Math.max(options.limit ?? 30, 1), 100);
  const rows = await db
    .collection(collectionName)
    .find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
  return rows.map((row) => normalizeTeamMessage(row as Record<string, unknown>));
}
