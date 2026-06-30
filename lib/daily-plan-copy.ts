// Daily-plan copy catalog (#intelligent-copy, reqs 1–3).
//
// Each habit gets its OWN set of distinct variants (description / descriptionB /
// descriptionC) that rotate by day. Crucially the variants are PER HABIT — there
// is no shared "context line" that would collapse every card to the same sentence
// at a given moment (the earlier evening line did exactly that). So neighbouring
// cards always read differently, and each card's wording also changes day to day.
// Resolving at render (from the task identity, not the descriptionKey stored on a
// possibly stale plan) means copy improvements apply immediately.

import { selectCopyKey, type CopyContext, type CopyDef } from "@/lib/copy-variants";

// Per-habit variants: distinct wording for THIS habit, rotated daily. The id
// includes the habit key so the rotation differs per card.
export function habitDescriptionDef(habitKey: string): CopyDef {
  const base = `athleteiq.dailyPlan.habits.${habitKey}`;
  return {
    id: `habit:${habitKey}:desc`,
    variants: [
      { key: `${base}.description` },
      { key: `${base}.descriptionB` },
      { key: `${base}.descriptionC` },
    ],
  };
}

const HABIT_ID_PREFIX = "habit:";

// Resolve the i18n key to render for a daily-plan task. Habit tasks go through the
// per-habit variant rotation; everything else uses the task's own descriptionKey.
export function resolveTaskDescriptionKey(
  task: { id: string; category: string; descriptionKey: string },
  ctx: CopyContext
): string {
  if (task.category === "habit" && task.id.startsWith(HABIT_ID_PREFIX)) {
    const habitKey = task.id.slice(HABIT_ID_PREFIX.length);
    return selectCopyKey(habitDescriptionDef(habitKey), ctx);
  }
  return task.descriptionKey;
}
