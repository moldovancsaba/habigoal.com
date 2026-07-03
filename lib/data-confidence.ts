// Canonical data-confidence engine (GH-253).
//
// The codebase had many ad-hoc confidence strings (HabigoalConfidence,
// DailyIqScoreConfidence, ProfileSourceConfidence, LiteModuleConfidence, …) with
// no shared classification. This module is the single source of truth for:
//   - a canonical confidence band,
//   - source-freshness/staleness classification,
//   - a missing-data-aware classifier, and
//   - reusable reason/label keys for honest "how trustworthy is this?" UI.
//
// Principle: never present stale, single-source, low-sample, or missing data as
// high confidence. Missing data is an explicit state, not silently treated as 0.

export type ConfidenceBand = "high" | "medium" | "low" | "none";
export type DataFreshness = "fresh" | "recent" | "stale" | "missing";

export const CONFIDENCE_BAND_RANK: Record<ConfidenceBand, number> = {
  none: 0,
  low: 1,
  medium: 2,
  high: 3,
};

const BAND_BY_RANK: ConfidenceBand[] = ["none", "low", "medium", "high"];

// Coerce any legacy confidence string onto the canonical band so existing
// surfaces can adopt the shared vocabulary without breaking. "insufficient",
// unknown, or empty values all collapse to "none".
export function normalizeConfidenceBand(value: string | null | undefined): ConfidenceBand {
  switch (String(value ?? "").trim().toLowerCase()) {
    case "high":
      return "high";
    case "medium":
      return "medium";
    case "low":
      return "low";
    default:
      return "none";
  }
}

// Weakest-link combination: a derived value is only as trustworthy as its least
// confident input. Empty input → "none".
export function minConfidenceBand(bands: Array<ConfidenceBand | string | null | undefined>): ConfidenceBand {
  if (!bands.length) return "none";
  return bands.reduce<ConfidenceBand>((lowest, raw) => {
    const band = normalizeConfidenceBand(typeof raw === "string" ? raw : raw ?? undefined);
    return CONFIDENCE_BAND_RANK[band] < CONFIDENCE_BAND_RANK[lowest] ? band : lowest;
  }, "high");
}

function shiftBand(band: ConfidenceBand, delta: number): ConfidenceBand {
  const rank = Math.max(0, Math.min(BAND_BY_RANK.length - 1, CONFIDENCE_BAND_RANK[band] + delta));
  return BAND_BY_RANK[rank];
}

export interface FreshnessOptions {
  /** At or under this age the data is "fresh". Default 24h. */
  recentHours?: number;
  /** Over this age the data is "stale". Between recent and stale it is "recent". Default 72h. */
  staleHours?: number;
}

export function classifyFreshness(
  lastUpdatedAt: string | number | Date | null | undefined,
  nowMs: number,
  options: FreshnessOptions = {}
): DataFreshness {
  if (lastUpdatedAt === null || lastUpdatedAt === undefined || lastUpdatedAt === "") return "missing";
  const ts = lastUpdatedAt instanceof Date ? lastUpdatedAt.getTime() : new Date(lastUpdatedAt).getTime();
  if (!Number.isFinite(ts)) return "missing";
  const recentMs = (options.recentHours ?? 24) * 3600_000;
  const staleMs = (options.staleHours ?? 72) * 3600_000;
  const ageMs = nowMs - ts;
  if (ageMs <= recentMs) return "fresh";
  if (ageMs <= staleMs) return "recent";
  return "stale";
}

export type ConfidenceReasonKey =
  | "missingData"
  | "lowSample"
  | "singleSource"
  | "multiSource"
  | "stale"
  | "fresh";

export interface DataConfidenceInput {
  /** Number of underlying data points (e.g. days of check-ins). */
  sampleSize?: number;
  /** Distinct contributing sources (e.g. check-in + wearable). */
  sourceCount?: number;
  /** Timestamp of the most recent contributing data point. */
  lastUpdatedAt?: string | number | Date | null;
  /** Current time in ms (injected for deterministic testing). */
  now: number;
  /** Names of expected-but-absent signals; non-empty means incomplete. */
  missingSignals?: string[];
  freshness?: FreshnessOptions;
}

export interface DataConfidenceResult {
  band: ConfidenceBand;
  freshness: DataFreshness;
  sampleSize: number;
  sourceCount: number;
  reasonKeys: ConfidenceReasonKey[];
}

// Deterministic, versioned classification. Order: establish a base band from
// sample size + source breadth, then downgrade for staleness, and force "none"
// when data is missing entirely. Reasons are surfaced so the UI can explain the
// band honestly rather than just showing a colour.
export function classifyDataConfidence(input: DataConfidenceInput): DataConfidenceResult {
  const sampleSize = Math.max(0, Math.floor(input.sampleSize ?? 0));
  const sourceCount = Math.max(0, Math.floor(input.sourceCount ?? 0));
  const freshness = classifyFreshness(input.lastUpdatedAt ?? null, input.now, input.freshness);
  const reasonKeys: ConfidenceReasonKey[] = [];

  if (sampleSize === 0 || freshness === "missing") {
    return { band: "none", freshness, sampleSize, sourceCount, reasonKeys: ["missingData"] };
  }

  let band: ConfidenceBand;
  if (sampleSize >= 7 && sourceCount >= 2) band = "high";
  else if (sampleSize >= 3) band = "medium";
  else band = "low";

  if (sampleSize < 3) reasonKeys.push("lowSample");
  reasonKeys.push(sourceCount >= 2 ? "multiSource" : "singleSource");

  if (freshness === "stale") {
    band = shiftBand(band, -1);
    reasonKeys.push("stale");
  } else if (freshness === "fresh") {
    reasonKeys.push("fresh");
  }

  return { band, freshness, sampleSize, sourceCount, reasonKeys };
}
