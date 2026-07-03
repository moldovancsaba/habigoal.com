import { describe, expect, it } from "vitest";
import {
  deriveReminders,
  isWithinQuietHours,
  applyReminderPolicy,
  localHourInTimezone,
} from "@/services/reminders.service";
import type { ReminderKey } from "@/types/reminder";

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

describe("isWithinQuietHours (GH-257)", () => {
  it("is false when no quiet hours are configured", () => {
    expect(isWithinQuietHours(3, undefined)).toBe(false);
  });

  it("treats start === end as no quiet hours", () => {
    expect(isWithinQuietHours(3, { start: 8, end: 8 })).toBe(false);
  });

  it("matches a same-day window over [start, end)", () => {
    expect(isWithinQuietHours(13, { start: 12, end: 14 })).toBe(true);
    expect(isWithinQuietHours(12, { start: 12, end: 14 })).toBe(true);
    expect(isWithinQuietHours(14, { start: 12, end: 14 })).toBe(false);
    expect(isWithinQuietHours(11, { start: 12, end: 14 })).toBe(false);
  });

  it("wraps past midnight when start > end", () => {
    const night = { start: 21, end: 7 };
    expect(isWithinQuietHours(22, night)).toBe(true);
    expect(isWithinQuietHours(3, night)).toBe(true);
    expect(isWithinQuietHours(7, night)).toBe(false);
    expect(isWithinQuietHours(12, night)).toBe(false);
  });
});

describe("applyReminderPolicy (GH-257)", () => {
  const due: ReminderKey[] = ["checkin", "habits", "reflection"];

  it("is the identity over due reminders with no preferences", () => {
    expect(applyReminderPolicy(due, { localHour: 10 })).toEqual(due);
  });

  it("suppresses all nudges during quiet hours", () => {
    expect(
      applyReminderPolicy(due, { localHour: 23, preferences: { quietHours: { start: 21, end: 7 } } })
    ).toEqual([]);
  });

  it("does not suppress outside quiet hours", () => {
    expect(
      applyReminderPolicy(due, { localHour: 10, preferences: { quietHours: { start: 21, end: 7 } } })
    ).toEqual(due);
  });

  it("caps the number of concurrent nudges", () => {
    expect(applyReminderPolicy(due, { localHour: 10, preferences: { maxConcurrent: 1 } })).toEqual(["checkin"]);
    expect(applyReminderPolicy(due, { localHour: 10, preferences: { maxConcurrent: 0 } })).toEqual([]);
  });

  it("applies quiet hours before the cadence cap", () => {
    expect(
      applyReminderPolicy(due, {
        localHour: 23,
        preferences: { quietHours: { start: 21, end: 7 }, maxConcurrent: 2 },
      })
    ).toEqual([]);
  });
});

describe("localHourInTimezone (GH-257)", () => {
  it("returns the local hour for a fixed instant in a known timezone", () => {
    // 2026-06-29T12:00:00Z is 14:00 in Europe/Budapest (UTC+2 in summer).
    const instant = new Date("2026-06-29T12:00:00.000Z");
    expect(localHourInTimezone("Europe/Budapest", instant)).toBe(14);
    expect(localHourInTimezone("UTC", instant)).toBe(12);
  });

  it("falls back to the server hour for an invalid timezone", () => {
    const instant = new Date("2026-06-29T12:00:00.000Z");
    expect(localHourInTimezone("Not/AZone", instant)).toBe(instant.getHours());
  });
});
