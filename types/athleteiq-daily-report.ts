import type { AthleteIqModuleClaimBoundary, AthleteIqModuleMaturity, AthleteIqReportVisibility } from "@/lib/athleteiq-modules";

export type DailyReportType = Extract<AthleteIqReportVisibility, "athlete" | "coach" | "parent" | "team">;

export type ReportSection = {
  key: string;
  titleKey: string;
  maturity: AthleteIqModuleMaturity;
  visibility: DailyReportType | "roadmap";
  claimBoundary: AthleteIqModuleClaimBoundary;
  facts: string[];
  recommendations: string[];
  evidenceLabels: string[];
  dataUsed: string[];
  missingData: string[];
  confidence: string;
};

export type DailyReportSnapshot = {
  id: string;
  athleteId?: string;
  teamId?: string;
  reportType: DailyReportType;
  localDate: string;
  sections: ReportSection[];
  roadmapAppendix: ReportSection[];
  dataUsed: string[];
  missingData: string[];
  moduleRegistryVersion: string;
  algorithmVersions: Record<string, string>;
  generatedAt: string;
  reportVersion: string;
};
