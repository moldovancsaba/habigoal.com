import type { AppRole } from "@/lib/access";
import type { AthleteIqModuleClaimBoundary, AthleteIqModuleMaturity } from "@/lib/athleteiq-modules";

export type AthleteTwinProjectionView = "athlete" | "coach" | "parent" | "team";
export type ProfileDimensionStatus = "active" | "lite_manual" | "future" | "setup_required" | "redacted";
export type ProfileSourceConfidence = "high" | "medium" | "low" | "insufficient";

export type ProfileDimension = {
  key: string;
  status: ProfileDimensionStatus;
  moduleMaturity: AthleteIqModuleMaturity | "setup_required" | "redacted";
  claimBoundary: AthleteIqModuleClaimBoundary | "no_live_claim" | "redacted";
  valueSummary: Record<string, unknown> | null;
  sourceLabels: string[];
  visibilityByRole: AppRole[];
  lastUpdatedAt: string | null;
  confidence: ProfileSourceConfidence;
  missingData: string[];
  redactedFields: string[];
};

export type AthleteTwinProjection = {
  id?: string;
  athlete: {
    id: string;
    name: string | null;
    status: string | null;
    position: string | null;
    organisationId: string | null;
  };
  view: AthleteTwinProjectionView;
  activeDimensions: ProfileDimension[];
  liteDimensions: ProfileDimension[];
  futureDimensions: ProfileDimension[];
  sourceConfidence: ProfileSourceConfidence;
  registryVersion: string;
  projectionVersion: string;
  redactions: string[];
  updatedAt: string;
};
