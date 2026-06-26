import { buildMemoryHandoff, buildReflectionEntry, nextLocalDate, redactReflectionForUser } from "@/lib/athleteiq-reflection";
import type { AuthUser } from "@/lib/access";
import { getReflection, listReflectionsByDay, updateReflectionVisibility, upsertReflection } from "@/repositories/athleteiq-reflection.repository";
import type { ReflectionVisibility } from "@/types/athleteiq-reflection";

export async function createReflection(input: {
  athleteId: string;
  localDate: string;
  body: string;
  moodTag?: string;
  visibility?: ReflectionVisibility;
}) {
  if (!input.body.trim()) return { skipped: true, reflection: null };
  const reflection = await upsertReflection(buildReflectionEntry(input));
  return { skipped: false, reflection };
}

export async function getReflectionDay(input: { athleteId: string; localDate: string; user: AuthUser }) {
  const reflections = await listReflectionsByDay(input);
  return reflections.map((entry) => redactReflectionForUser(input.user, entry));
}

export async function getReflectionForAccess(id: string) {
  return getReflection(id);
}

export async function setReflectionVisibility(input: {
  entryId: string;
  visibility: ReflectionVisibility;
  actorEmail: string;
}) {
  const entry = await getReflection(input.entryId);
  if (!entry) return null;
  return updateReflectionVisibility({ entry, visibility: input.visibility, actorEmail: input.actorEmail });
}

export async function getMemoryHandoff(input: { athleteId: string; fromDate: string }) {
  const entries = await listReflectionsByDay({ athleteId: input.athleteId, localDate: input.fromDate });
  return buildMemoryHandoff({
    athleteId: input.athleteId,
    fromDate: input.fromDate,
    toDate: nextLocalDate(input.fromDate),
    entries
  });
}
