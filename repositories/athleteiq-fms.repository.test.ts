import { beforeEach, describe, expect, it, vi } from "vitest";
import { getLatestFmsScreen, listFmsScreens, upsertFmsScreen } from "@/repositories/athleteiq-fms.repository";
import { getDatabase } from "@/lib/mongodb";
import { FMS_SUBTESTS } from "@/types/athleteiq-fms";
import type { FmsScreen, FmsScores } from "@/types/athleteiq-fms";

vi.mock("@/lib/mongodb", () => ({ getDatabase: vi.fn() }));

function scores(value = 2): FmsScores {
  return FMS_SUBTESTS.reduce((acc, s) => ({ ...acc, [s]: value }), {} as FmsScores);
}
function screen(overrides: Partial<FmsScreen> = {}): FmsScreen {
  return { athleteId: "a1", date: "2026-06-28", scores: scores(), painFlags: {}, composite: 14, recordedBy: "physio@example.com", createdAt: "2026-06-28T09:00:00.000Z", ...overrides };
}

describe("upsertFmsScreen", () => {
  beforeEach(() => vi.clearAllMocks());

  it("upserts idempotently keyed by athleteId and date", async () => {
    const findOneAndUpdate = vi.fn(async (..._args: unknown[]) => ({ _id: "s1", ...screen() }));
    const collection = vi.fn(() => ({ findOneAndUpdate }));
    vi.mocked(getDatabase).mockResolvedValue({ collection } as never);

    const result = await upsertFmsScreen(screen());

    const [filter, , options] = findOneAndUpdate.mock.calls[0];
    expect(filter).toEqual({ athleteId: "a1", date: "2026-06-28" });
    expect(options).toEqual({ upsert: true, returnDocument: "after" });
    expect(result.id).toBe("s1");
  });
});

describe("getLatestFmsScreen", () => {
  beforeEach(() => vi.clearAllMocks());

  it("reads the newest screen by date", async () => {
    const next = vi.fn(async () => ({ _id: "s9", ...screen({ composite: 18 }) }));
    const limit = vi.fn(() => ({ next }));
    const sort = vi.fn(() => ({ limit }));
    const find = vi.fn(() => ({ sort }));
    vi.mocked(getDatabase).mockResolvedValue({ collection: vi.fn(() => ({ find })) } as never);

    const result = await getLatestFmsScreen("a1");
    expect(find).toHaveBeenCalledWith({ athleteId: "a1" });
    expect(sort).toHaveBeenCalledWith({ date: -1 });
    expect(result?.composite).toBe(18);
  });
});

describe("listFmsScreens", () => {
  beforeEach(() => vi.clearAllMocks());

  it("applies an inclusive date range filter and bounded limit", async () => {
    const toArray = vi.fn(async () => []);
    const limit = vi.fn(() => ({ toArray }));
    const sort = vi.fn(() => ({ limit }));
    const find = vi.fn(() => ({ sort }));
    vi.mocked(getDatabase).mockResolvedValue({ collection: vi.fn(() => ({ find })) } as never);

    await listFmsScreens("a1", { from: "2026-06-01", to: "2026-06-30" });
    expect(find).toHaveBeenCalledWith({ athleteId: "a1", date: { $gte: "2026-06-01", $lte: "2026-06-30" } });
    expect(sort).toHaveBeenCalledWith({ date: -1 });
    expect(limit).toHaveBeenCalledWith(60);
  });
});
