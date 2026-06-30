// Surface "voice" catalogs (#intelligent-copy, ecosystem roll-out).
//
// The hero subline on each surface (Habigoal, Athlete IQ athlete, Athlete IQ
// trainer) is the most-seen piece of copy. A static line reads robotic; a
// time-of-day-aware line that also rotates day to day makes the whole ecosystem
// feel attentive and professional. This builds a CopyDef for any hero subtitle:
// the original line stays as a neutral variant, plus neutral alternates and
// morning/afternoon/evening greetings.
//
// Keys are i18n keys RELATIVE to the namespace the consuming component already
// uses, so the component just does t(selectCopyKey(def, ctx)).

import { isAfternoon, isEvening, isMorning, type CopyDef } from "@/lib/copy-variants";

// Generic time-aware copy: the original line stays as a neutral variant, plus
// two neutral alternates and morning/afternoon/evening greetings, all living
// under `${baseKey}Variants.*`. Used for any frequently-seen line that should
// feel attentive (hero sublines, reflection prompts, etc.).
export function timeAwareCopyDef(baseKey: string): CopyDef {
  return {
    id: baseKey,
    variants: [
      { key: baseKey },
      { key: `${baseKey}Variants.neutralB` },
      { key: `${baseKey}Variants.neutralC` },
      { key: `${baseKey}Variants.morning`, when: isMorning },
      { key: `${baseKey}Variants.afternoon`, when: isAfternoon },
      { key: `${baseKey}Variants.evening`, when: isEvening },
    ],
  };
}

// `baseKey` is the existing subtitle key, e.g. "hero.subtitle". Variants live
// under `${baseKey}Variants.*`.
export function heroSubtitleDef(baseKey: string): CopyDef {
  return timeAwareCopyDef(baseKey);
}

// The reflection prompt (Textarea placeholder) invites the athlete to write.
// A time-aware, rotating prompt reads as a thoughtful coach rather than a
// static form field. Variants live under `${baseKey}Variants.*`.
export function reflectionPromptDef(baseKey: string): CopyDef {
  return timeAwareCopyDef(baseKey);
}
