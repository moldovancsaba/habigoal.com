// Check-in prompt variants (#intelligent-copy, reqs 1–3).
//
// Each readiness signal keeps its stable title (the actual question), but the
// supporting prompt line rotates among three per-signal variants so the daily
// check-in feels attentive rather than identical every day. Keys are relative to
// the "Assessment" namespace the check-in already uses.

import { selectCopyKey, type CopyContext, type CopyDef } from "@/lib/copy-variants";

// Per-signal variants: the original prompt + two alternates, rotated by day.
export function checkInPromptDef(promptKey: string): CopyDef {
  return {
    id: `checkin:${promptKey}`,
    variants: [{ key: promptKey }, { key: `${promptKey}B` }, { key: `${promptKey}C` }],
  };
}

export function resolveCheckInPromptKey(promptKey: string, ctx: CopyContext): string {
  return selectCopyKey(checkInPromptDef(promptKey), ctx);
}
