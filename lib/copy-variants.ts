// Copy Variant Engine (#intelligent-copy, reqs 1–3).
//
// Every prompt/microcopy we show can have several wordings so the product feels
// attentive and intelligent rather than repeating one line everywhere. This is the
// deterministic selector behind that:
//   - CONDITION-GATED variants win first (e.g. an evening line, a streak-milestone
//     line, a low-confidence line) — copy that is *right for the moment*.
//   - otherwise we DAILY-ROTATE through the neutral variants with a stable hash of
//     (date + seed + messageId), so the wording changes day to day but is fully
//     deterministic and testable (no Math.random, no fabrication).
//
// Variants are i18n keys; the engine only decides WHICH key — next-intl renders it.

export type TimeOfDay = "morning" | "afternoon" | "evening" | "night";
export type CopyConfidence = "high" | "medium" | "low" | "none";
export type CopyMomentum = "rising" | "steady" | "falling";

export interface CopyContext {
  /** Current time in ms (injected for determinism/testing). */
  now: number;
  /** Stable per-athlete seed so two athletes don't always see the same rotation. */
  seed?: string;
  timeOfDay?: TimeOfDay;
  /** Current habit/check-in streak in days. */
  streakDays?: number;
  /** Days since the last relevant entry (null = never). */
  daysSinceLast?: number | null;
  /** 0=Sun … 6=Sat. */
  dayOfWeek?: number;
  dataConfidence?: CopyConfidence;
  momentum?: CopyMomentum;
  /** True when the underlying data is missing/empty. */
  missing?: boolean;
  /** Completion ratio 0..1 for the relevant area. */
  completionRate?: number;
}

export interface CopyVariant {
  /** i18n key this variant resolves to. */
  key: string;
  /** Optional condition; when present and true, the variant becomes eligible as a
   *  context-matched ("intelligent") line. Variants with no `when` are neutral. */
  when?: (ctx: Required<Pick<CopyContext, "now">> & CopyContext) => boolean;
}

export interface CopyDef {
  /** Stable id used to seed deterministic rotation. */
  id: string;
  /** Ordered variants. Convention: include ≥3 neutral variants for daily rotation,
   *  plus any number of context-gated ones. */
  variants: CopyVariant[];
}

export function deriveTimeOfDay(now: number): TimeOfDay {
  const hour = new Date(now).getHours();
  if (hour < 6) return "night";
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

// FNV-1a — small, fast, dependency-free, stable across runs.
function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function rotate<T>(items: T[], def: CopyDef, ctx: CopyContext): T {
  const dateKey = new Date(ctx.now).toISOString().slice(0, 10);
  const index = hashString(`${dateKey}:${ctx.seed ?? ""}:${def.id}`) % items.length;
  return items[index];
}

// Resolve the i18n key to render for a copy definition in a given context.
export function selectCopyKey(def: CopyDef, ctx: CopyContext): string {
  if (def.variants.length === 0) return def.id;
  const full: CopyContext = { ...ctx, timeOfDay: ctx.timeOfDay ?? deriveTimeOfDay(ctx.now) };

  // 1) Context-matched variants win. If several match, daily-rotate among them so a
  //    persistent condition (e.g. an ongoing streak) still varies its wording.
  const gated = def.variants.filter((v) => v.when && v.when(full as Required<Pick<CopyContext, "now">> & CopyContext));
  if (gated.length > 0) return rotate(gated, def, full).key;

  // 2) Otherwise rotate the neutral variants by day.
  const neutral = def.variants.filter((v) => !v.when);
  if (neutral.length > 0) return rotate(neutral, def, full).key;

  return def.variants[0].key;
}

// Convenience guards for building catalogs.
export const isEvening = (ctx: CopyContext) => (ctx.timeOfDay ?? deriveTimeOfDay(ctx.now)) === "evening" || (ctx.timeOfDay ?? deriveTimeOfDay(ctx.now)) === "night";
export const isMorning = (ctx: CopyContext) => (ctx.timeOfDay ?? deriveTimeOfDay(ctx.now)) === "morning";
export const hasStreak = (min: number) => (ctx: CopyContext) => (ctx.streakDays ?? 0) >= min;
export const lowConfidence = (ctx: CopyContext) => ctx.dataConfidence === "low" || ctx.dataConfidence === "none";
export const isMissing = (ctx: CopyContext) => ctx.missing === true;
export const returning = (afterDays: number) => (ctx: CopyContext) => (ctx.daysSinceLast ?? 0) >= afterDays;
