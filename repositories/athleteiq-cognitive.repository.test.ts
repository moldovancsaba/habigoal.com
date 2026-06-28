import { beforeEach, describe, expect, it, vi } from "vitest";
import { listLatestCognitiveEntries, upsertCognitiveTraitEntry } from "@/repositories/athleteiq-cognitive.repository";
import { getDatabase } from "@/lib/mongodb";
import type { CognitiveTraitEntry } from "@/types/athleteiq-cognitive";

vi.mock("@/lib/mongodb", () => ({ getDatabase: vi.fn() }));

function entry(overrides: Partial<CognitiveTraitEntry> = {}): CognitiveTraitEntry {
  return {
    athleteId: "a1",
    trait: "attention",
    localDate: "2026-06-28",
    score: 70,
    source: "manual_entry",
    enteredAt: "2026-06-28T08:00:00.000Z",
    actorEmail: "coach@example.com",
    ...overrides
  };
}

describe("upsertCognitiveTraitEntry", () => {
  beforeEach(() => vi.clearAllMocks());

  it("upserts idempotently keyed by athleteId, trait and localDate", async () => {
    const findOneAndUpdate = vi.fn(async (..._args: unknown[]) => ({ _id: "x1", ...entry() }));
    const collection = vi.fn(() => ({ findOneAndUpdate }));
    vi.mocked(getDatabase).mockResolvedValue({ collection } as never);

    const result = await upsertCognitiveTraitEntry(entry());

    const [filter, update, options] = findOneAndUpdate.mock.calls[0];
    expect(filter).toEqual({ athleteId: "a1", trait: "attention", localDate: "2026-06-28" });
    expect(update).toEqual({ $set: { score: 70, source: "manual_entry", enteredAt: "2026-06-28T08:00:00.000Z", actorEmail: "coach@example.com" } });
    expect(options).toEqual({ upsert: true, returnDocument: "after" });
    expect(result.id).toBe("x1");
  });
});

describe("listLatestCognitiveEntries", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the newest entry per trait", async () => {
    const rows = [
      { _id: "n1", ...entry({ trait: "attention", score: 90, enteredAt: "2026-06-28T10:00:00.000Z" }) },
      { _id: "n2", ...entry({ trait: "attention", score: 40, enteredAt: "2026-06-27T10:00:00.000Z" }) },
      { _id: "n3", ...entry({ trait: "risk", score: 55, enteredAt: "2026-06-28T09:00:00.000Z" }) }
    ];
    const toArray = vi.fn(async () => rows);
    const sort = vi.fn(() => ({ toArray }));
    const find = vi.fn(() => ({ sort }));
    const collection = vi.fn(() => ({ find }));
    vi.mocked(getDatabase).mockResolvedValue({ collection } as never);

    const result = await listLatestCognitiveEntries("a1");

    expect(find).toHaveBeenCalledWith({ athleteId: "a1" });
    expect(sort).toHaveBeenCalledWith({ enteredAt: -1 });
    expect(result).toHaveLength(2);
    const attention = result.find((row) => row.trait === "attention");
    expect(attention?.score).toBe(90);
  });
});
