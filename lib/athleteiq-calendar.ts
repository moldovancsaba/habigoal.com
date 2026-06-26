import type { DailyPlan } from "@/types/athleteiq-daily-plan";
import type { AthleteIqSession } from "@/types/athleteiq-session";
import type {
  AthleteIqDayConflict,
  AthleteIqDayContext,
  AthleteIqDayEntry,
  AthleteIqDayEntrySource,
  AthleteIqDayEntryType,
  AthleteIqDayEntryVisibility,
  AthleteIqDayWindow
} from "@/types/athleteiq-calendar";

export const ATHLETEIQ_CALENDAR_CAPABILITY_KEY = "AIQ-1280";
export const ATHLETEIQ_CALENDAR_VERSION = "aiq-calendar-1280.1";

export const athleteIqDayEntryTypes: AthleteIqDayEntryType[] = ["sleep", "school", "training", "match", "recovery", "travel", "personal", "task"];
export const athleteIqDayEntryVisibilities: AthleteIqDayEntryVisibility[] = ["private", "support_team", "coach", "shared"];

export function buildDayEntry(input: {
  athleteId: string;
  localDate: string;
  type: AthleteIqDayEntryType;
  titleKeyOrText: string;
  visibility?: AthleteIqDayEntryVisibility;
  source?: AthleteIqDayEntrySource;
  startAt?: string;
  endAt?: string;
  linkedPlanTaskId?: string;
  linkedSessionId?: string;
  priority?: AthleteIqDayEntry["priority"];
}, now = new Date()): AthleteIqDayEntry {
  const timestamp = now.toISOString();
  return {
    id: `aiq-day-entry:${crypto.randomUUID()}`,
    athleteId: input.athleteId,
    localDate: input.localDate,
    type: input.type,
    titleKeyOrText: input.titleKeyOrText,
    visibility: input.visibility ?? "shared",
    source: input.source ?? "manual",
    startAt: input.startAt,
    endAt: input.endAt,
    linkedPlanTaskId: input.linkedPlanTaskId,
    linkedSessionId: input.linkedSessionId,
    priority: input.priority,
    createdAt: timestamp,
    updatedAt: timestamp,
    auditHistory: [`created:${timestamp}`]
  };
}

export function validateDayEntryInput(input: {
  athleteId?: string;
  localDate?: string;
  type?: string;
  titleKeyOrText?: string;
  visibility?: string;
  startAt?: string;
  endAt?: string;
}) {
  const errors: string[] = [];
  if (!input.athleteId) errors.push("athleteId is required");
  if (!input.localDate || !/^\d{4}-\d{2}-\d{2}$/.test(input.localDate)) errors.push("localDate must use YYYY-MM-DD");
  if (!input.type || !athleteIqDayEntryTypes.includes(input.type as AthleteIqDayEntryType)) errors.push(`type must be one of ${athleteIqDayEntryTypes.join(", ")}`);
  if (!input.titleKeyOrText?.trim()) errors.push("titleKeyOrText is required");
  if (input.visibility && !athleteIqDayEntryVisibilities.includes(input.visibility as AthleteIqDayEntryVisibility)) errors.push(`visibility must be one of ${athleteIqDayEntryVisibilities.join(", ")}`);
  if ((input.startAt && !input.endAt) || (!input.startAt && input.endAt)) errors.push("startAt and endAt must be provided together");
  if (input.startAt && input.endAt) {
    const start = Date.parse(input.startAt);
    const end = Date.parse(input.endAt);
    if (!Number.isFinite(start) || !Number.isFinite(end)) errors.push("startAt and endAt must be ISO timestamps");
    if (Number.isFinite(start) && Number.isFinite(end) && start >= end) errors.push("startAt must be before endAt");
  }
  return errors;
}

export function buildDayContext(input: {
  athleteId: string;
  localDate: string;
  timezone: string;
  manualEntries: AthleteIqDayEntry[];
  dailyPlan?: DailyPlan | null;
  sessions?: AthleteIqSession[];
}, now = new Date()): AthleteIqDayContext {
  const planEntries = input.dailyPlan ? input.dailyPlan.tasks.map((task) => buildDayEntry({
    athleteId: input.athleteId,
    localDate: input.localDate,
    type: "task",
    titleKeyOrText: task.titleKey,
    visibility: "shared",
    source: "daily_plan",
    linkedPlanTaskId: task.id,
    priority: task.priority
  }, now)) : [];
  const sessionEntries = (input.sessions ?? []).flatMap((session) => entriesFromSession(session, now));
  const activeManualEntries = input.manualEntries.filter((entry) => !entry.deletedAt);
  const allEntries = [...activeManualEntries, ...planEntries, ...sessionEntries];
  const timedEntries = sortTimedEntries(allEntries);
  const unscheduledEntries = allEntries.filter((entry) => !entry.startAt || !entry.endAt);
  const loadWindows = timedEntries.filter(isLoadEntry).map(toWindow);
  const recoveryWindows = findRecoveryWindows(timedEntries);

  return {
    athleteId: input.athleteId,
    localDate: input.localDate,
    timezone: input.timezone,
    entries: timedEntries,
    unscheduledEntries,
    loadWindows,
    recoveryWindows,
    conflicts: [...findOverlapConflicts(timedEntries), ...findInsufficientRecoveryConflicts(loadWindows)],
    dataUsed: [
      "manual_day_entries",
      ...(input.dailyPlan ? ["daily_plan"] : []),
      ...((input.sessions?.length ?? 0) > 0 ? ["athleteiq_sessions"] : [])
    ],
    missingData: [
      ...(input.dailyPlan ? [] : ["daily_plan"]),
      ...((input.sessions?.length ?? 0) > 0 ? [] : ["athleteiq_sessions"])
    ],
    generatedAt: now.toISOString(),
    version: ATHLETEIQ_CALENDAR_VERSION
  };
}

function entriesFromSession(session: AthleteIqSession, now: Date): AthleteIqDayEntry[] {
  if (!session.log.startedAt) {
    return [buildDayEntry({
      athleteId: session.athleteId,
      localDate: session.localDate,
      type: "training",
      titleKeyOrText: "athleteiq.calendar.session.unscheduled",
      visibility: "shared",
      source: "session",
      linkedSessionId: session.sessionId
    }, now)];
  }

  let cursor = Date.parse(session.log.startedAt);
  return session.blocks.map((block) => {
    const startAt = new Date(cursor).toISOString();
    cursor += block.durationMinutes * 60_000;
    const endAt = new Date(cursor).toISOString();
    return buildDayEntry({
      athleteId: session.athleteId,
      localDate: session.localDate,
      type: block.type === "recovery" || block.type === "cooldown" ? "recovery" : "training",
      titleKeyOrText: block.instructionsKey,
      visibility: "shared",
      source: "session",
      startAt,
      endAt,
      linkedSessionId: session.sessionId
    }, now);
  });
}

function sortTimedEntries(entries: AthleteIqDayEntry[]) {
  return entries
    .filter((entry) => entry.startAt && entry.endAt)
    .sort((left, right) => Date.parse(left.startAt!) - Date.parse(right.startAt!) || left.id.localeCompare(right.id));
}

function toWindow(entry: AthleteIqDayEntry): AthleteIqDayWindow {
  const start = Date.parse(entry.startAt!);
  const end = Date.parse(entry.endAt!);
  return {
    startAt: entry.startAt!,
    endAt: entry.endAt!,
    minutes: Math.max(0, Math.round((end - start) / 60_000)),
    sourceEntryIds: [entry.id]
  };
}

function isLoadEntry(entry: AthleteIqDayEntry) {
  return entry.type === "training" || entry.type === "match";
}

function findOverlapConflicts(entries: AthleteIqDayEntry[]): AthleteIqDayConflict[] {
  const conflicts: AthleteIqDayConflict[] = [];
  for (let index = 1; index < entries.length; index += 1) {
    const previous = entries[index - 1];
    const current = entries[index];
    if (Date.parse(previous.endAt!) > Date.parse(current.startAt!)) {
      conflicts.push({
        entryIds: [previous.id, current.id],
        code: "overlap",
        messageKey: "athleteiq.calendar.conflicts.overlap"
      });
    }
  }
  return conflicts;
}

function findRecoveryWindows(entries: AthleteIqDayEntry[]): AthleteIqDayWindow[] {
  const windows: AthleteIqDayWindow[] = [];
  for (let index = 1; index < entries.length; index += 1) {
    const previous = entries[index - 1];
    const current = entries[index];
    const start = Date.parse(previous.endAt!);
    const end = Date.parse(current.startAt!);
    const minutes = Math.round((end - start) / 60_000);
    if (minutes >= 60) {
      windows.push({
        startAt: previous.endAt!,
        endAt: current.startAt!,
        minutes,
        sourceEntryIds: [previous.id, current.id]
      });
    }
  }
  return windows;
}

function findInsufficientRecoveryConflicts(loadWindows: AthleteIqDayWindow[]): AthleteIqDayConflict[] {
  const conflicts: AthleteIqDayConflict[] = [];
  for (let index = 1; index < loadWindows.length; index += 1) {
    const previous = loadWindows[index - 1];
    const current = loadWindows[index];
    const gapMinutes = Math.round((Date.parse(current.startAt) - Date.parse(previous.endAt)) / 60_000);
    if (gapMinutes >= 0 && gapMinutes < 120) {
      conflicts.push({
        entryIds: [...previous.sourceEntryIds, ...current.sourceEntryIds],
        code: "insufficient_recovery",
        messageKey: "athleteiq.calendar.conflicts.insufficientRecovery"
      });
    }
  }
  return conflicts;
}
