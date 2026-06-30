// Daily-plan copy catalog (#intelligent-copy, reqs 1–3).
//
// Each habit task keeps its OWN specific description (so cards aren't identical),
// but the wording also rotates day-to-day and adapts to context (evening, an
// active streak, a return after a gap). Resolving the key at render — from the
// task identity, not the descriptionKey stored on the (possibly stale) plan — also
// means copy improvements apply immediately to already-generated plans.

import { selectCopyKey, hasStreak, isEvening, returning, type CopyContext, type CopyDef } from "@/lib/copy-variants";

const NUDGE = "athleteiq.dailyPlan.habitNudge";

// Habit description: the per-habit specific line + two neutral alternates rotate
// daily; context lines (evening / streak / returning) take over when they apply.
export function habitDescriptionDef(habitKey: string): CopyDef {
  return {
    id: `habit:${habitKey}:desc`,
    variants: [
      { key: `athleteiq.dailyPlan.habits.${habitKey}.description` },
      { key: `${NUDGE}.neutralB` },
      { key: `${NUDGE}.neutralC` },
      { key: `${NUDGE}.evening`, when: isEvening },
      { key: `${NUDGE}.streak`, when: hasStreak(3) },
      { key: `${NUDGE}.returning`, when: returning(2) },
    ],
  };
}

const HABIT_ID_PREFIX = "habit:";

// Resolve the i18n key to render for a daily-plan task. Habit tasks go through the
// variant engine; everything else uses the task's own descriptionKey.
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
