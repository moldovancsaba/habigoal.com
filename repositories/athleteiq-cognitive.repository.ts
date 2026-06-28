import { getDatabase } from "@/lib/mongodb";
import type { CognitiveTrait, CognitiveTraitEntry } from "@/types/athleteiq-cognitive";

const collectionName = "athleteiq_cognitive_entries";
type CognitiveEntryDocument = Omit<CognitiveTraitEntry, "id">;

function normalizeEntry(record: Record<string, unknown>): CognitiveTraitEntry {
  const id = record._id != null ? String(record._id) : typeof record.id === "string" ? record.id : undefined;
  return {
    id,
    athleteId: String(record.athleteId ?? ""),
    trait: record.trait as CognitiveTrait,
    localDate: String(record.localDate ?? ""),
    score: Number(record.score ?? 0),
    source: "manual_entry",
    enteredAt: String(record.enteredAt ?? ""),
    actorEmail: typeof record.actorEmail === "string" ? record.actorEmail : undefined
  };
}

// Idempotent per (athleteId, trait, localDate): a same-day re-entry overwrites
// the stored score rather than appending a duplicate row.
export async function upsertCognitiveTraitEntry(entry: CognitiveTraitEntry): Promise<CognitiveTraitEntry> {
  const db = await getDatabase();
  const collection = db.collection<CognitiveEntryDocument>(collectionName);
  const result = await collection.findOneAndUpdate(
    { athleteId: entry.athleteId, trait: entry.trait, localDate: entry.localDate },
    {
      $set: {
        score: entry.score,
        source: entry.source,
        enteredAt: entry.enteredAt,
        actorEmail: entry.actorEmail
      }
    },
    { upsert: true, returnDocument: "after" }
  );
  return result ? normalizeEntry(result as unknown as Record<string, unknown>) : entry;
}

// Latest entry per trait for an athlete, bounded to the trait set. Reads newest
// first so the first occurrence per trait is the current value.
export async function listLatestCognitiveEntries(athleteId: string): Promise<CognitiveTraitEntry[]> {
  const db = await getDatabase();
  const records = await db
    .collection<CognitiveEntryDocument>(collectionName)
    .find({ athleteId })
    .sort({ enteredAt: -1 })
    .toArray();

  const latestByTrait = new Map<CognitiveTrait, CognitiveTraitEntry>();
  for (const record of records) {
    const entry = normalizeEntry(record as unknown as Record<string, unknown>);
    if (!latestByTrait.has(entry.trait)) latestByTrait.set(entry.trait, entry);
  }
  return Array.from(latestByTrait.values());
}
