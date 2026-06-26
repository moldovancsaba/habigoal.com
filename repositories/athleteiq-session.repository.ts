import { getDatabase } from "@/lib/mongodb";
import { toJsonId } from "@/lib/utils";
import type { AthleteIqSession, AthleteIqSessionLog, AthleteIqSessionState } from "@/types/athleteiq-session";

const collectionName = "athleteiq_sessions";
type AthleteIqSessionDocument = Omit<AthleteIqSession, "id">;

function normalizeSession(record: Record<string, unknown>) {
  return toJsonId(record) as unknown as AthleteIqSession;
}

export async function upsertAthleteIqSession(session: AthleteIqSession) {
  const db = await getDatabase();
  const collection = db.collection<AthleteIqSessionDocument>(collectionName);
  const existing = await collection.findOne({ sessionId: session.sessionId });
  const auditHistory = session.auditHistory.length > (existing?.auditHistory?.length ?? 0) ? session.auditHistory : [...(existing?.auditHistory ?? []), `saved:${session.updatedAt}`];
  const result = await collection.findOneAndUpdate(
    { sessionId: session.sessionId },
    { $set: { ...session, auditHistory } },
    { upsert: true, returnDocument: "after" }
  );
  return normalizeSession(result as unknown as Record<string, unknown>);
}

export async function getAthleteIqSession(sessionId: string) {
  const db = await getDatabase();
  const collection = db.collection<AthleteIqSessionDocument>(collectionName);
  const record = await collection.findOne({ sessionId });
  return record ? normalizeSession(record as unknown as Record<string, unknown>) : null;
}

export async function listAthleteIqSessions(input: { athleteId: string; from?: string; to?: string }) {
  const db = await getDatabase();
  const collection = db.collection<AthleteIqSessionDocument>(collectionName);
  const dateQuery: Record<string, string> = {};
  if (input.from) dateQuery.$gte = input.from;
  if (input.to) dateQuery.$lte = input.to;
  const records = await collection.find({
    athleteId: input.athleteId,
    ...(Object.keys(dateQuery).length ? { localDate: dateQuery } : {})
  }).sort({ localDate: -1, updatedAt: -1 }).toArray();
  return records.map((record) => normalizeSession(record as unknown as Record<string, unknown>));
}

export async function updateAthleteIqSessionState(input: {
  session: AthleteIqSession;
  state: AthleteIqSessionState;
  actorEmail: string;
  reason?: string;
}) {
  const now = new Date().toISOString();
  return upsertAthleteIqSession({
    ...input.session,
    state: input.state,
    log: {
      ...input.session.log,
      ...(input.state === "active" && !input.session.log.startedAt ? { startedAt: now } : {}),
      ...(input.state === "completed" ? { completedAt: now } : {})
    },
    auditHistory: [...input.session.auditHistory, `state:${input.state}:${now}:${input.actorEmail}${input.reason ? `:${input.reason}` : ""}`],
    updatedAt: now
  });
}

export async function updateAthleteIqSessionDebrief(input: {
  session: AthleteIqSession;
  log: Partial<AthleteIqSessionLog>;
  actorEmail: string;
}) {
  const now = new Date().toISOString();
  return upsertAthleteIqSession({
    ...input.session,
    state: "completed",
    log: {
      ...input.session.log,
      ...input.log,
      completedAt: input.log.completedAt ?? now
    },
    auditHistory: [...input.session.auditHistory, `debrief:${now}:${input.actorEmail}`],
    updatedAt: now
  });
}
