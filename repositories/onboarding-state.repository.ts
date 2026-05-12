import { getDatabase } from "@/lib/mongodb";
import { createDefaultOnboardingState } from "@/lib/onboarding/default-state";
import { toJsonId } from "@/lib/utils";
import type { OnboardingChecklistProgress, OnboardingStateRecord } from "@/types/onboarding";

const collectionName = "onboarding_state";

function normalizeStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function normalizeChecklistProgress(value: unknown): OnboardingChecklistProgress {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).map(([moduleId, stepIds]) => [moduleId, normalizeStringArray(stepIds)])
  );
}

function normalizeState(doc: Record<string, unknown>): OnboardingStateRecord {
  const json = toJsonId(doc) as Record<string, unknown>;

  return {
    _id: typeof json._id === "string" ? json._id : undefined,
    userEmail: typeof json.userEmail === "string" ? json.userEmail : "",
    completedModules: normalizeStringArray(json.completedModules),
    dismissedModules: normalizeStringArray(json.dismissedModules),
    seenReleaseVersions: normalizeStringArray(json.seenReleaseVersions),
    checklistProgress: normalizeChecklistProgress(json.checklistProgress),
    lastSuggestedModule: typeof json.lastSuggestedModule === "string" ? json.lastSuggestedModule : undefined,
    updatedAt: typeof json.updatedAt === "string" ? json.updatedAt : new Date().toISOString()
  };
}

export async function getOnboardingStateByEmail(userEmail: string) {
  const db = await getDatabase();
  const doc = await db.collection(collectionName).findOne({ userEmail: userEmail.toLowerCase().trim() });
  return doc ? normalizeState(doc as Record<string, unknown>) : null;
}

export async function upsertOnboardingState(state: OnboardingStateRecord) {
  const db = await getDatabase();
  const normalizedEmail = state.userEmail.toLowerCase().trim();
  const payload = {
    userEmail: normalizedEmail,
    completedModules: Array.from(new Set(state.completedModules)),
    dismissedModules: Array.from(new Set(state.dismissedModules)),
    seenReleaseVersions: Array.from(new Set(state.seenReleaseVersions)),
    checklistProgress: state.checklistProgress,
    lastSuggestedModule: state.lastSuggestedModule,
    updatedAt: new Date().toISOString()
  };

  await db.collection(collectionName).updateOne(
    { userEmail: normalizedEmail },
    { $set: payload, $setOnInsert: { createdAt: new Date().toISOString() } },
    { upsert: true }
  );

  return {
    ...payload
  } satisfies OnboardingStateRecord;
}
