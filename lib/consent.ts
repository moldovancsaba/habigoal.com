import { ConsentPurpose } from "../types/consent";
import { findActiveConsent } from "../repositories/consent.repository";

export const CURRENT_PRIVACY_NOTICE_VERSION = "2026-06-01";
export const YOUTH_AGE_THRESHOLD = 16;

/**
 * Validates if the athlete has an active consent for the given purpose.
 * It checks the status, guardian approval (if required), and privacy notice version.
 */
export async function isConsentValid(
  athleteId: string,
  purpose: ConsentPurpose
): Promise<boolean> {
  const consent = await findActiveConsent(athleteId, purpose);
  if (!consent) return false;
  if (consent.status !== "active") return false;
  if (consent.guardianRequired && !consent.guardianConsentedAt) return false;
  if (consent.privacyNoticeVersion !== CURRENT_PRIVACY_NOTICE_VERSION) return false;
  
  return true;
}

/**
 * Enforces consent requirement. Throws if invalid.
 */
export async function requireConsent(
  athleteId: string,
  purpose: ConsentPurpose
): Promise<void> {
  // If the env variable is set to disable consent checks (e.g. for testing)
  if (process.env.HABIGOAL_ENFORCE_CONSENT === "false") {
    return;
  }

  const isValid = await isConsentValid(athleteId, purpose);
  if (!isValid) {
    const error = new Error(`Valid consent is required for purpose: ${purpose}`);
    Object.assign(error, { code: "CONSENT_REQUIRED" });
    throw error;
  }
}
