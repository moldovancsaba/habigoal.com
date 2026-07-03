// Parent-safe report projection (GH-261).
//
// Coaches see the full athlete report (including clinical/injury-risk detail and
// raw internal metrics). Parents should get an encouraging, privacy-respecting
// summary — never raw injury/clinical figures, and never strong claims when the
// data is thin. This pure projection redacts clinical content, keeps
// parent-appropriate highlights, attaches an honest confidence band (reusing the
// canonical engine, GH-253), and is transparent that some detail is coach-only
// rather than silently dropping it.

import type { AthleteReport } from "@/services/reporting.service";
import { normalizeConfidenceBand, type ConfidenceBand } from "@/lib/data-confidence";

// Metric keys that must never appear in a parent-facing summary.
const CLINICAL_METRIC_PATTERN = /injury|risk|clinic|medical|pain|load ratio|acwr/i;

export type ParentEncouragementKey = "building" | "steady" | "strong";

export interface ParentSafeHighlight {
  label: string;
  value: number | string;
}

export interface ParentSafeReport {
  athleteId: string;
  reportDate: string;
  dateRange: { from: string; to: string };
  summary: string;
  highlights: ParentSafeHighlight[];
  confidenceBand: ConfidenceBand;
  encouragementKey: ParentEncouragementKey;
  /** Names of sections withheld from the parent view (kept with the coach).
   *  Surfaced so the redaction is transparent, not silent. */
  coachOnlyKeys: string[];
}

function encouragementForBand(band: ConfidenceBand): ParentEncouragementKey {
  if (band === "high") return "strong";
  if (band === "medium") return "steady";
  return "building";
}

export function toParentSafeReport(
  report: AthleteReport,
  options: { confidence?: ConfidenceBand | string | null } = {}
): ParentSafeReport {
  const band = normalizeConfidenceBand(typeof options.confidence === "string" ? options.confidence : options.confidence ?? undefined);

  const highlights: ParentSafeHighlight[] = [];
  const coachOnlyKeys: string[] = [];
  for (const [label, value] of Object.entries(report.keyMetrics)) {
    if (CLINICAL_METRIC_PATTERN.test(label)) {
      coachOnlyKeys.push(label);
    } else {
      highlights.push({ label, value });
    }
  }

  return {
    athleteId: report.athleteId,
    reportDate: report.reportDate,
    dateRange: report.dateRange,
    summary: report.summary,
    highlights,
    confidenceBand: band,
    encouragementKey: encouragementForBand(band),
    // Coach notes and engine/clinical guidance are never exposed to parents.
    coachOnlyKeys,
  };
}
