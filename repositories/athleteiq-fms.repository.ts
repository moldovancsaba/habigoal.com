import { getDatabase } from "@/lib/mongodb";
import type { FmsScreen } from "@/types/athleteiq-fms";

const collectionName = "fms_screens";
type FmsScreenDocument = Omit<FmsScreen, "id">;

function normalizeScreen(record: Record<string, unknown>): FmsScreen {
  const id = record._id != null ? String(record._id) : typeof record.id === "string" ? record.id : undefined;
  return {
    id,
    athleteId: String(record.athleteId ?? ""),
    date: String(record.date ?? ""),
    scores: (record.scores ?? {}) as FmsScreen["scores"],
    painFlags: (record.painFlags ?? {}) as FmsScreen["painFlags"],
    composite: Number(record.composite ?? 0),
    notes: typeof record.notes === "string" ? record.notes : undefined,
    recordedBy: String(record.recordedBy ?? ""),
    createdAt: String(record.createdAt ?? "")
  };
}

// Idempotent per (athleteId, date): a same-day re-capture overwrites the screen.
export async function upsertFmsScreen(screen: FmsScreen): Promise<FmsScreen> {
  const db = await getDatabase();
  const collection = db.collection<FmsScreenDocument>(collectionName);
  const result = await collection.findOneAndUpdate(
    { athleteId: screen.athleteId, date: screen.date },
    {
      $set: {
        scores: screen.scores,
        painFlags: screen.painFlags,
        composite: screen.composite,
        notes: screen.notes,
        recordedBy: screen.recordedBy,
        createdAt: screen.createdAt
      }
    },
    { upsert: true, returnDocument: "after" }
  );
  return result ? normalizeScreen(result as unknown as Record<string, unknown>) : screen;
}

export async function getLatestFmsScreen(athleteId: string): Promise<FmsScreen | null> {
  const db = await getDatabase();
  const record = await db
    .collection<FmsScreenDocument>(collectionName)
    .find({ athleteId })
    .sort({ date: -1 })
    .limit(1)
    .next();
  return record ? normalizeScreen(record as unknown as Record<string, unknown>) : null;
}

// History newest-first, optionally bounded by an inclusive [from, to] date range.
export async function listFmsScreens(
  athleteId: string,
  options: { from?: string; to?: string; limit?: number } = {}
): Promise<FmsScreen[]> {
  const db = await getDatabase();
  const filter: Record<string, unknown> = { athleteId };
  if (options.from || options.to) {
    filter.date = {
      ...(options.from ? { $gte: options.from } : {}),
      ...(options.to ? { $lte: options.to } : {})
    };
  }
  const limit = Math.min(Math.max(options.limit ?? 60, 1), 200);
  const records = await db
    .collection<FmsScreenDocument>(collectionName)
    .find(filter)
    .sort({ date: -1 })
    .limit(limit)
    .toArray();
  return records.map((record) => normalizeScreen(record as unknown as Record<string, unknown>));
}
