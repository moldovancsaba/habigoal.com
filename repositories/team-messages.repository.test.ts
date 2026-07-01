import { beforeEach, describe, expect, it, vi } from "vitest";
import { insertTeamBroadcast, listTeamMessages } from "@/repositories/team-messages.repository";
import { getDatabase } from "@/lib/mongodb";

vi.mock("@/lib/mongodb", () => ({ getDatabase: vi.fn() }));

function makeDb(rows: Record<string, unknown>[]) {
  const find = vi.fn();
  const sort = vi.fn();
  const limit = vi.fn();
  const toArray = vi.fn(async () => rows);
  limit.mockReturnValue({ toArray });
  sort.mockReturnValue({ limit });
  find.mockReturnValue({ sort });
  const collection = vi.fn(() => ({ find }));
  return { db: { collection }, find, sort, limit };
}

describe("listTeamMessages", () => {
  beforeEach(() => vi.clearAllMocks());

  it("filters by teamId, sorts newest-first, and applies a bounded limit", async () => {
    const { db, find, sort, limit } = makeDb([{ _id: "m1", teamId: "t1", text: "hi", createdAt: "2026-01-02" }]);
    vi.mocked(getDatabase).mockResolvedValue(db as never);

    const result = await listTeamMessages("t1", { limit: 10 });

    expect(find).toHaveBeenCalledWith({ teamId: "t1" });
    expect(sort).toHaveBeenCalledWith({ createdAt: -1 });
    expect(limit).toHaveBeenCalledWith(10);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("m1");
  });

  it("scopes by recipientId and paginates with `before`", async () => {
    const { db, find } = makeDb([]);
    vi.mocked(getDatabase).mockResolvedValue(db as never);

    await listTeamMessages("t1", { recipientId: "a1", before: "2026-01-05" });

    expect(find).toHaveBeenCalledWith({ teamId: "t1", recipientId: "a1", createdAt: { $lt: "2026-01-05" } });
  });

  it("clamps the page size to the 1..100 range", async () => {
    const { db, limit } = makeDb([]);
    vi.mocked(getDatabase).mockResolvedValue(db as never);

    await listTeamMessages("t1", { limit: 9999 });
    expect(limit).toHaveBeenCalledWith(100);

    await listTeamMessages("t1", { limit: 0 });
    expect(limit).toHaveBeenCalledWith(1);
  });

  it("applies a case-insensitive regex filter on text when searching", async () => {
    const { db, find } = makeDb([]);
    vi.mocked(getDatabase).mockResolvedValue(db as never);

    await listTeamMessages("t1", { search: "practice" });

    expect(find).toHaveBeenCalledWith({ teamId: "t1", text: { $regex: "practice", $options: "i" } });
  });

  it("escapes regex metacharacters in the search term", async () => {
    const { db, find } = makeDb([]);
    vi.mocked(getDatabase).mockResolvedValue(db as never);

    await listTeamMessages("t1", { search: "5pm (sharp)" });

    expect(find).toHaveBeenCalledWith({ teamId: "t1", text: { $regex: "5pm \\(sharp\\)", $options: "i" } });
  });

  it("ignores a blank/whitespace-only search term", async () => {
    const { db, find } = makeDb([]);
    vi.mocked(getDatabase).mockResolvedValue(db as never);

    await listTeamMessages("t1", { search: "   " });

    expect(find).toHaveBeenCalledWith({ teamId: "t1" });
  });
});

describe("insertTeamBroadcast", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fans out one message per athlete, sharing a single broadcastId", async () => {
    const inserted: Record<string, unknown>[] = [];
    const insertOne = vi.fn(async (doc: Record<string, unknown>) => {
      inserted.push(doc);
      return { insertedId: { toString: () => `id-${inserted.length}` } };
    });
    const collection = vi.fn(() => ({ insertOne }));
    vi.mocked(getDatabase).mockResolvedValue({ collection } as never);

    const messages = await insertTeamBroadcast({
      teamId: "t1",
      athleteIds: ["a1", "a2"],
      text: "Practice moved to 5pm",
      senderEmail: "coach@example.com",
      senderName: "Coach"
    });

    expect(messages).toHaveLength(2);
    expect(messages.map((m) => m.recipientId)).toEqual(["a1", "a2"]);
    expect(messages.every((m) => m.text === "Practice moved to 5pm")).toBe(true);
    expect(messages[0].broadcastId).toBeDefined();
    expect(messages[0].broadcastId).toBe(messages[1].broadcastId);
  });

  it("returns an empty array for a team with no athletes", async () => {
    const insertOne = vi.fn();
    const collection = vi.fn(() => ({ insertOne }));
    vi.mocked(getDatabase).mockResolvedValue({ collection } as never);

    const messages = await insertTeamBroadcast({
      teamId: "t1",
      athleteIds: [],
      text: "Hello",
      senderEmail: "coach@example.com",
      senderName: "Coach"
    });

    expect(messages).toEqual([]);
    expect(insertOne).not.toHaveBeenCalled();
  });
});
