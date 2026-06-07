import { describe, expect, it } from "vitest";
import { ClassScoutProfileService, InMemoryClassScoutProfileRepository } from "./profile-service";

const now = () => new Date("2026-06-07T10:00:00.000Z");

function createService() {
  const events: unknown[] = [];
  const service = new ClassScoutProfileService({
    repository: new InMemoryClassScoutProfileRepository(),
    now,
    createId: () => `id-${events.length + 1}`,
    audit: (event) => events.push(event),
    timeoutMs: 500
  });

  return { service, events };
}

describe("ClassScoutProfileService", () => {
  it("creates a normalized redacted child activity profile", async () => {
    const { service, events } = createService();

    const result = await service.createChildProfile({
      householdId: " household-1 ",
      nickname: "  Sam  ",
      ageBand: "6-8",
      gradeBand: "k-2",
      neighborhoodPreference: "  District 11  ",
      interests: [" art ", "art", " coding "],
      constraints: ["beginner_friendly", "beginner_friendly"],
      experienceSignals: { saved: 1.8, rejected: -1 },
      supportNotes: " needs a quieter first session "
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data).toMatchObject({
      householdId: "household-1",
      nickname: "Sam",
      ageBand: "6-8",
      gradeBand: "k-2",
      neighborhoodPreference: "District 11",
      interests: ["art", "coding"],
      constraints: ["beginner_friendly"],
      experienceSignals: { saved: 1 },
      hasSupportNotes: true
    });
    expect("supportNotes" in result.data).toBe(false);
    expect(events).toHaveLength(1);
  });

  it("denies cross-household updates", async () => {
    const { service } = createService();
    const created = await service.createChildProfile({ householdId: "household-1", nickname: "Sam", ageBand: "6-8" });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const denied = await service.updateChildProfile(created.data.id, { householdId: "household-2", nickname: "Sam", ageBand: "6-8" });

    expect(denied.ok).toBe(false);
    if (denied.ok) return;
    expect(denied.state).toBe("permission_denied");
    expect(denied.error.code).toBe("HOUSEHOLD_SCOPE_DENIED");
  });

  it("exports household data without sensitive support notes", async () => {
    const { service } = createService();
    await service.createChildProfile({ householdId: "household-1", nickname: "Sam", ageBand: "6-8", supportNotes: "private" });
    await service.updateHouseholdPreferences({
      householdId: "household-1",
      travelModes: [" transit ", "walk"],
      availableWindows: [{ dayOfWeek: "saturday", startTime: "09:00", endTime: "12:00" }],
      includeNeighborhoods: ["Buda"],
      excludeNeighborhoods: [],
      formatPreferences: ["drop-in"]
    });

    const exported = await service.exportHouseholdProfile("household-1");

    expect(exported.ok).toBe(true);
    if (!exported.ok) return;
    expect(exported.data.profiles).toHaveLength(1);
    expect(exported.data.profiles[0].hasSupportNotes).toBe(true);
    expect("supportNotes" in exported.data.profiles[0]).toBe(false);
    expect(exported.data.preferences?.travelModes).toEqual(["transit", "walk"]);
  });

  it("marks deletion without removing the profile record", async () => {
    const { service } = createService();
    const created = await service.createChildProfile({ householdId: "household-1", nickname: "Sam", ageBand: "6-8" });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const deleted = await service.requestProfileDeletion(created.data.id, "household-1");
    const listed = await service.listHouseholdProfiles("household-1");

    expect(deleted.ok).toBe(true);
    if (deleted.ok) {
      expect(deleted.state).toBe("deletion_pending");
      expect(deleted.data.deletedAt).toBe("2026-06-07T10:00:00.000Z");
    }
    expect(listed.ok).toBe(true);
    if (listed.ok) {
      expect(listed.data).toEqual([]);
    }
  });

  it("returns validation errors for missing household and nickname", async () => {
    const { service } = createService();

    const missingHousehold = await service.createChildProfile({ householdId: " ", nickname: "Sam", ageBand: "6-8" });
    const missingNickname = await service.createChildProfile({ householdId: "household-1", nickname: " ", ageBand: "6-8" });

    expect(missingHousehold.ok).toBe(false);
    if (!missingHousehold.ok) {
      expect(missingHousehold.error.code).toBe("HOUSEHOLD_REQUIRED");
    }
    expect(missingNickname.ok).toBe(false);
    if (!missingNickname.ok) {
      expect(missingNickname.error.code).toBe("NICKNAME_REQUIRED");
    }
  });
});
