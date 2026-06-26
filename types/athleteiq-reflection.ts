export type ReflectionVisibility = "private" | "coach_summary" | "parent_summary";

export type ReflectionEntry = {
  id: string;
  athleteId: string;
  localDate: string;
  body: string;
  moodTag?: string;
  visibility: ReflectionVisibility;
  safeSummary: string;
  derivedTags: string[];
  createdAt: string;
  updatedAt: string;
  auditHistory: string[];
};

export type ReflectionEntryView = Omit<ReflectionEntry, "body"> & {
  body?: string;
  rawBodyAvailable: boolean;
  redacted: boolean;
};

export type MemoryHandoff = {
  athleteId: string;
  fromDate: string;
  toDate: string;
  tags: string[];
  summaryForPlanning: string;
  sourceReflectionIds: string[];
  excludedPrivateContent: boolean;
  dataUsed: string[];
  missingData: string[];
  generatedAt: string;
  version: string;
};
