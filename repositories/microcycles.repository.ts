import { getDatabase } from "@/lib/mongodb";
import { toJsonId } from "@/lib/utils";
import type { Microcycle } from "@/types/training-plan";

const COLLECTION = "microcycles";

function normalize(raw: Record<string, unknown>): Microcycle {
  const json = toJsonId(raw);
  return {
    microcycleId: typeof json.microcycleId === "string" ? json.microcycleId : crypto.randomUUID(),
    teamId: typeof json.teamId === "string" ? json.teamId : "",
    startDate: typeof json.startDate === "string" ? json.startDate : "",
    endDate: typeof json.endDate === "string" ? json.endDate : "",
    goal: typeof json.goal === "string" ? json.goal : "",
    sessionIds: Array.isArray(json.sessionIds) ? json.sessionIds.filter((v): v is string => typeof v === "string") : [],
  };
}

export async function listMicrocycles(teamId?: string): Promise<Microcycle[]> {
  const db = await getDatabase();
  const query = teamId ? { teamId } : {};
  const rows = await db.collection(COLLECTION).find(query).sort({ startDate: -1 }).toArray();
  return rows.map((r) => normalize(r as Record<string, unknown>));
}

export async function upsertMicrocycle(cycle: Microcycle): Promise<Microcycle> {
  const db = await getDatabase();
  await db.collection(COLLECTION).updateOne(
    { microcycleId: cycle.microcycleId },
    { $set: cycle },
    { upsert: true }
  );
  const saved = await db.collection(COLLECTION).findOne({ microcycleId: cycle.microcycleId });
  return normalize(saved as Record<string, unknown>);
}
