import type { AuthUser } from "@/lib/access";
import type { MemoryHandoff, ReflectionEntry, ReflectionEntryView, ReflectionVisibility } from "@/types/athleteiq-reflection";

export const ATHLETEIQ_REFLECTION_CAPABILITY_KEY = "AIQ-1290";
export const ATHLETEIQ_REFLECTION_VERSION = "aiq-reflection-1290.1";

export const reflectionVisibilities: ReflectionVisibility[] = ["private", "coach_summary", "parent_summary"];

const tagRules: Array<[string, RegExp]> = [
  ["sleep", /\b(sleep|slept|tired|fatigue|exhausted)\b/i],
  ["pain", /\b(pain|sore|soreness|hurt|injury)\b/i],
  ["stress", /\b(stress|anxious|anxiety|pressure|overwhelmed)\b/i],
  ["confidence", /\b(confident|ready|strong|sharp|focused)\b/i],
  ["school", /\b(school|exam|class|study|homework)\b/i],
  ["travel", /\b(travel|trip|bus|flight|commute)\b/i],
  ["recovery", /\b(recover|recovery|rest|stretch|breathing)\b/i],
  ["competition", /\b(match|game|competition|tournament|win|loss)\b/i]
];

export function buildReflectionEntry(input: {
  athleteId: string;
  localDate: string;
  body: string;
  moodTag?: string;
  visibility?: ReflectionVisibility;
}, now = new Date()): ReflectionEntry {
  const timestamp = now.toISOString();
  const derived = deriveSafeReflection(input.body, input.moodTag);
  return {
    id: `aiq-reflection:${crypto.randomUUID()}`,
    athleteId: input.athleteId,
    localDate: input.localDate,
    body: input.body.trim(),
    moodTag: input.moodTag?.trim() || undefined,
    visibility: input.visibility ?? "private",
    safeSummary: derived.safeSummary,
    derivedTags: derived.derivedTags,
    createdAt: timestamp,
    updatedAt: timestamp,
    auditHistory: [`created:${timestamp}`]
  };
}

export function deriveSafeReflection(body: string, moodTag?: string) {
  const derivedTags = tagRules.filter(([, pattern]) => pattern.test(body)).map(([tag]) => tag);
  if (moodTag?.trim()) derivedTags.push(`mood:${moodTag.trim().toLowerCase()}`);
  const uniqueTags = Array.from(new Set(derivedTags)).slice(0, 8);
  return {
    derivedTags: uniqueTags,
    safeSummary: uniqueTags.length > 0 ? `Reflection signals: ${uniqueTags.join(", ")}` : "Reflection saved with no derived planning tags."
  };
}

export function validateReflectionInput(input: {
  athleteId?: string;
  localDate?: string;
  body?: string;
  visibility?: string;
}) {
  const errors: string[] = [];
  if (!input.athleteId) errors.push("athleteId is required");
  if (!input.localDate || !/^\d{4}-\d{2}-\d{2}$/.test(input.localDate)) errors.push("localDate must use YYYY-MM-DD");
  if (input.body !== undefined && input.body.length > 5000) errors.push("body must be 5000 characters or fewer");
  if (input.visibility && !reflectionVisibilities.includes(input.visibility as ReflectionVisibility)) errors.push(`visibility must be one of ${reflectionVisibilities.join(", ")}`);
  return errors;
}

export function canSeeRawReflection(user: AuthUser, entry: ReflectionEntry) {
  return user.primaryRole === "athlete" && user.athleteId === entry.athleteId;
}

export function redactReflectionForUser(user: AuthUser, entry: ReflectionEntry): ReflectionEntryView {
  const rawBodyAvailable = canSeeRawReflection(user, entry);
  const canSeeSummary = rawBodyAvailable || user.primaryRole === "admin" || entry.visibility === "coach_summary" || entry.visibility === "parent_summary";
  return {
    ...entry,
    body: rawBodyAvailable ? entry.body : undefined,
    safeSummary: canSeeSummary ? entry.safeSummary : "Private reflection saved.",
    derivedTags: canSeeSummary ? entry.derivedTags : [],
    rawBodyAvailable,
    redacted: !rawBodyAvailable
  };
}

export function buildMemoryHandoff(input: {
  athleteId: string;
  fromDate: string;
  toDate: string;
  entries: ReflectionEntry[];
}, now = new Date()): MemoryHandoff {
  const tags = Array.from(new Set(input.entries.flatMap((entry) => entry.derivedTags))).slice(0, 12);
  const summaries = input.entries
    .filter((entry) => entry.visibility !== "private")
    .map((entry) => entry.safeSummary)
    .slice(0, 3);
  return {
    athleteId: input.athleteId,
    fromDate: input.fromDate,
    toDate: input.toDate,
    tags,
    summaryForPlanning: summaries.length ? summaries.join(" ") : "Private reflection context exists; use derived tags only.",
    sourceReflectionIds: input.entries.map((entry) => entry.id),
    excludedPrivateContent: true,
    dataUsed: input.entries.length ? ["reflection_tags"] : [],
    missingData: input.entries.length ? [] : ["reflection_entries"],
    generatedAt: now.toISOString(),
    version: ATHLETEIQ_REFLECTION_VERSION
  };
}

export function nextLocalDate(localDate: string) {
  const next = new Date(`${localDate}T00:00:00.000Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString().slice(0, 10);
}
