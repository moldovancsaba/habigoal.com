import { beforeEach, describe, expect, it, vi } from "vitest";
import { ATHLETE_PII_COLLECTIONS, athletePiiCollectionNames } from "@/lib/athlete-pii-registry";
import { eraseAthleteData } from "@/services/privacy.service";
import { getDatabase } from "@/lib/mongodb";
import { getChildById, deleteChildById } from "@/repositories/child.repository";
import { listMediaByAthlete } from "@/repositories/media-asset.repository";
import { deleteAthleteMediaObjects } from "@/lib/media-storage";

vi.mock("@/lib/mongodb", () => ({ getDatabase: vi.fn() }));
vi.mock("@/repositories/child.repository", () => ({ getChildById: vi.fn(), deleteChildById: vi.fn() }));
vi.mock("@/repositories/assessment.repository", () => ({ listAssessmentsByChildId: vi.fn(async () => []) }));
vi.mock("@/repositories/athlete-twin.repository", () => ({ findTwinByAthleteId: vi.fn(async () => null) }));
vi.mock("@/repositories/device-connection.repository", () => ({ findConnectionsByAthleteId: vi.fn(async () => []) }));
vi.mock("@/repositories/media-asset.repository", () => ({ listMediaByAthlete: vi.fn() }));
vi.mock("@/lib/media-storage", () => ({ deleteAthleteMediaObjects: vi.fn(async () => 1) }));

const ATHLETE_ID = "507f1f77bcf86cd799439011";

type CollectionStub = {
  deleteMany: ReturnType<typeof vi.fn>;
  updateMany: ReturnType<typeof vi.fn>;
  find: ReturnType<typeof vi.fn>;
};

function makeDb() {
  const stubs = new Map<string, CollectionStub>();
  const db = {
    collection: vi.fn((name: string) => {
      if (!stubs.has(name)) {
        stubs.set(name, {
          deleteMany: vi.fn(async () => ({ deletedCount: 1 })),
          updateMany: vi.fn(async () => ({ modifiedCount: 1 })),
          find: vi.fn(() => ({ toArray: async () => [] })),
        });
      }
      return stubs.get(name)!;
    }),
  };
  return { db, stubs };
}

describe("athlete PII registry", () => {
  it("covers the expected athlete-PII collection set (guards against omissions)", () => {
    const expected = [
      "assessments",
      "athlete_twins",
      "athleteiq_calendar_entries",
      "athleteiq_checkins",
      "athleteiq_cognitive_entries",
      "athleteiq_daily_iq_snapshots",
      "athleteiq_daily_plans",
      "athleteiq_daily_reports",
      "athleteiq_lite_module_entries",
      "athleteiq_mental_routine_completions",
      "athleteiq_pain_alerts",
      "athleteiq_readiness_routes",
      "athleteiq_reflections",
      "athleteiq_sessions",
      "athleteiq_twin_projections",
      "audit_events",
      "canonical_metrics",
      "children",
      "coach_actions",
      "consents",
      "device_connections",
      "fms_screens",
      "habit_records",
      "media_assets",
      "raw_metrics",
      "teams",
      "training_load_records",
      "vision_analyses",
    ].sort();
    expect(athletePiiCollectionNames()).toEqual(expected);
  });

  it("uses the right key field for non-athleteId collections", () => {
    const byName = Object.fromEntries(ATHLETE_PII_COLLECTIONS.map((e) => [e.collection, e]));
    expect(byName.coach_actions.keyField).toBe("athleteKey");
    expect(byName.audit_events.keyField).toBe("resourceId");
    expect(byName.teams.strategy).toBe("pull");
    expect(byName.teams.keyField).toBe("athleteIds");
  });
});

describe("eraseAthleteData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getChildById).mockResolvedValue({ _id: ATHLETE_ID, name: "Test", birthDate: "2010-01-01" } as never);
    vi.mocked(deleteChildById).mockResolvedValue(undefined as never);
    vi.mocked(listMediaByAthlete).mockResolvedValue([{ storageKey: "athletes/x/m1.jpg" }] as never);
  });

  it("hard-deletes every registry collection + profile + assessments, and cleans media objects", async () => {
    const { db, stubs } = makeDb();
    vi.mocked(getDatabase).mockResolvedValue(db as never);

    const receipt = await eraseAthleteData(ATHLETE_ID);

    // Every uniform registry collection was touched with the correct operation.
    for (const entry of ATHLETE_PII_COLLECTIONS) {
      const stub = stubs.get(entry.collection);
      expect(stub, `collection ${entry.collection} should be accessed`).toBeDefined();
      if (entry.strategy === "pull") {
        expect(stub!.updateMany).toHaveBeenCalledWith(
          { [entry.keyField]: ATHLETE_ID },
          { $pull: { [entry.keyField]: ATHLETE_ID } }
        );
      } else {
        expect(stub!.deleteMany).toHaveBeenCalledWith({ [entry.keyField]: ATHLETE_ID });
      }
      expect(receipt.counts[entry.collection]).toBeGreaterThanOrEqual(0);
    }

    // Profile + assessments handled explicitly.
    expect(stubs.get("assessments")!.deleteMany).toHaveBeenCalled();
    expect(deleteChildById).toHaveBeenCalledTimes(1);
    expect(receipt.counts.children).toBe(1);
    expect(receipt.counts).toHaveProperty("assessments");

    // Media object-storage cleanup invoked with collected keys.
    expect(deleteAthleteMediaObjects).toHaveBeenCalledWith(ATHLETE_ID, ["athletes/x/m1.jpg"]);
    expect(receipt.mediaObjectsDeleted).toBe(1);
  });
});
