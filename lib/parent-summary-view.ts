// View-model mapping for the parent (guardian) summary surface.
//
// The backend `parent_summary` projection (built by buildParentProjection) is
// already redacted to parent-safe fields. This pure mapper adapts that
// projection into the exact shape the parent dashboard renders, so the page
// stays a thin DS view and the redaction contract is testable in isolation.
//
// Privacy rule: the projection never carries redacted *values* (only the names
// of fields that were withheld, in `redactions`). This mapper therefore only
// surfaces a redaction indicator — it never reads or echoes redacted data.

import type { ParentProjection } from "@/types/athleteiq-stakeholder";

export type ParentSummaryView = {
  athleteId: string;
  localDate: string;
  summary: string;
  completedTasks: number;
  safeNotes: string[];
  // i18n key for the suggested next support action (e.g.
  // "athleteiq.parents.actions.keepRoutine"); resolved at render time.
  supportActionKey: string;
  sourceLabels: string[];
  hasRedactions: boolean;
  redactionCount: number;
};

export function toParentSummaryView(projection: ParentProjection): ParentSummaryView {
  const redactions = Array.isArray(projection.redactions) ? projection.redactions : [];
  return {
    athleteId: projection.athleteId,
    localDate: projection.localDate,
    summary: projection.dailySummary ?? "",
    completedTasks: Number.isFinite(projection.completedTasks) ? projection.completedTasks : 0,
    safeNotes: Array.isArray(projection.safeNotes) ? projection.safeNotes : [],
    supportActionKey: projection.nextSupportAction,
    sourceLabels: Array.isArray(projection.sourceLabels) ? projection.sourceLabels : [],
    hasRedactions: redactions.length > 0,
    redactionCount: redactions.length
  };
}
