import { describe, expect, it } from "vitest";
import { deriveReminders } from "@/services/reminders.service";

describe("deriveReminders", () => {
  it("returns every outstanding daily action in flow order", () => {
    expect(deriveReminders({ checkInDone: false, habitsDone: false, reflectionDone: false })).toEqual([
      "checkin",
      "habits",
      "reflection"
    ]);
  });

  it("omits actions already completed", () => {
    expect(deriveReminders({ checkInDone: true, habitsDone: false, reflectionDone: true })).toEqual(["habits"]);
  });

  it("returns nothing when the day is complete", () => {
    expect(deriveReminders({ checkInDone: true, habitsDone: true, reflectionDone: true })).toEqual([]);
  });
});
