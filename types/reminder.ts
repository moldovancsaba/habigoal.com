export type ReminderKey = "checkin" | "habits" | "reflection";

export type DailyCompletion = {
  checkInDone: boolean;
  habitsDone: boolean;
  reflectionDone: boolean;
};

// Reminder delivery policy (GH-257). Deterministic, privacy-safe rules applied
// before any nudge is surfaced. Quiet hours are expressed as local hours in the
// athlete's timezone over the half-open range [0, 24); when `start > end` the
// window wraps midnight (e.g. { start: 21, end: 7 } means 21:00–06:59).
// `maxConcurrent` caps how many nudges surface at once so the athlete is never
// shown an overwhelming wall of reminders.
export type ReminderPreferences = {
  quietHours?: { start: number; end: number };
  maxConcurrent?: number;
};
