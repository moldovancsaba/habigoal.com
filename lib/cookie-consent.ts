// Cookie consent categories (#423). Necessary cookies are always allowed;
// functional (e.g. NEXT_LOCALE language preference) and analytics (telemetry)
// require explicit consent. The choice is stored in a single first-party
// cookie as a category list, e.g. "necessary,functional".

export const COOKIE_CONSENT_NAME = "habigoal_cookie_consent";

export type CookieCategory = "necessary" | "functional" | "analytics";
export type CookieConsent = Record<CookieCategory, boolean>;

export const ESSENTIAL_ONLY: CookieConsent = { necessary: true, functional: false, analytics: false };
export const ACCEPT_ALL: CookieConsent = { necessary: true, functional: true, analytics: true };

/** Parse the cookie value into a consent state, or null if no choice was made. */
export function parseCookieConsent(raw: string | null | undefined): CookieConsent | null {
  if (!raw) return null;
  const parts = raw.split(",").map((s) => s.trim()).filter(Boolean);
  if (parts.length === 0) return null;
  return {
    necessary: true,
    functional: parts.includes("functional"),
    analytics: parts.includes("analytics"),
  };
}

/** Serialize to the cookie value, e.g. "necessary,functional". */
export function serializeCookieConsent(consent: CookieConsent): string {
  const cats: CookieCategory[] = ["necessary"];
  if (consent.functional) cats.push("functional");
  if (consent.analytics) cats.push("analytics");
  return cats.join(",");
}

export function hasCategory(raw: string | null | undefined, category: CookieCategory): boolean {
  const consent = parseCookieConsent(raw);
  return consent ? consent[category] : false;
}

/** Client-side read of the current consent cookie. */
export function readCookieConsent(): CookieConsent | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.split("; ").find((c) => c.startsWith(`${COOKIE_CONSENT_NAME}=`));
  return parseCookieConsent(match ? match.slice(COOKIE_CONSENT_NAME.length + 1) : null);
}

/** Client-side check for a category (false until the user has consented). */
export function hasConsentFor(category: CookieCategory): boolean {
  return readCookieConsent()?.[category] ?? false;
}
