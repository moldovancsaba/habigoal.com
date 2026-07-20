import { findLatestConsent } from "@/repositories/consent.repository";
import type { AuthUser } from "@/lib/access";
import { CURRENT_PRIVACY_NOTICE_VERSION } from "@/lib/consent";
import type { ConsentPurpose, ConsentRecord } from "@/types/consent";

export type SharedDataCategory =
  | "habit_summary"
  | "daily_check_in"
  | "readiness"
  | "training_load"
  | "reflection"
  | "wearable_metric"
  | "injury_status"
  | "report"
  | "coach_note";

export type ConsentDecisionReason = "granted" | "missing" | "revoked" | "not_required" | "admin_override";
export type ConsentProjection = "none" | "summary" | "detail";

export type ConsentDecision = {
  allowed: boolean;
  category: SharedDataCategory;
  projection: ConsentProjection;
  reason: ConsentDecisionReason;
};

export const sharedDataCategoryPurposes: Record<SharedDataCategory, ConsentPurpose | null> = {
  habit_summary: "daily_check_in",
  daily_check_in: "daily_check_in",
  readiness: "daily_check_in",
  training_load: "performance_device_data",
  reflection: "ai_processing",
  wearable_metric: "wearable_data",
  injury_status: "daily_check_in",
  report: "report_sharing",
  coach_note: null
};

const TRAINER_READ_ROLES = new Set(["trainer", "performance_coach", "physio", "analyst"]);

export function requiresTrainerConsent(user: AuthUser, athleteId: string) {
  if (user.primaryRole === "admin" || user.primaryRole === "club_management") return false;
  if (user.primaryRole === "athlete" && user.athleteId === athleteId) return false;
  return TRAINER_READ_ROLES.has(user.primaryRole);
}

export async function resolveConsentDecisions(input: {
  athleteId: string;
  categories: readonly SharedDataCategory[];
  user: AuthUser;
}): Promise<ConsentDecision[]> {
  if (input.user.primaryRole === "admin" || input.user.primaryRole === "club_management") {
    return input.categories.map((category) => ({
      allowed: true,
      category,
      projection: "detail",
      reason: "admin_override"
    }));
  }

  if (!requiresTrainerConsent(input.user, input.athleteId)) {
    return input.categories.map((category) => ({
      allowed: true,
      category,
      projection: "detail",
      reason: "not_required"
    }));
  }

  return Promise.all(input.categories.map((category) => resolveTrainerCategoryDecision(input.athleteId, category)));
}

export function canProjectCategory(decisions: readonly ConsentDecision[], category: SharedDataCategory) {
  return decisions.find((decision) => decision.category === category)?.allowed ?? false;
}

export function buildNotRequiredConsentDecisions(categories: readonly SharedDataCategory[]): ConsentDecision[] {
  return categories.map((category) => ({
    allowed: true,
    category,
    projection: "detail",
    reason: "not_required"
  }));
}

async function resolveTrainerCategoryDecision(athleteId: string, category: SharedDataCategory): Promise<ConsentDecision> {
  const purpose = sharedDataCategoryPurposes[category];
  if (!purpose) {
    return {
      allowed: true,
      category,
      projection: "detail",
      reason: "not_required"
    };
  }

  const record = await findLatestConsent(athleteId, purpose);
  const reason = resolveConsentReason(record);
  const allowed = reason === "granted";
  return {
    allowed,
    category,
    projection: allowed ? "summary" : "none",
    reason
  };
}

function resolveConsentReason(record: ConsentRecord | null): ConsentDecisionReason {
  if (!record) return "missing";
  if (record.status === "withdrawn" || record.status === "expired") return "revoked";
  if (record.status !== "active") return "missing";
  if (record.guardianRequired && !record.guardianConsentedAt) return "missing";
  if (record.privacyNoticeVersion !== CURRENT_PRIVACY_NOTICE_VERSION) return "revoked";
  return "granted";
}
