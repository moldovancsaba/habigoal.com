// Pure, runtime-agnostic sliding-refresh policy for the session cookie.
// Kept dependency-free so it is safe to import from the edge middleware and to
// unit-test in isolation. See docs/adaptive-system-design.md §A.

export const SESSION_DURATION_DAYS = Number(process.env.SESSION_DURATION_DAYS) > 0 ? Number(process.env.SESSION_DURATION_DAYS) : 30;
export const SESSION_DURATION_MS = SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000;

export type RefreshablePayload = {
  iat?: number;
  exp?: number;
  expires?: number;
  [key: string]: unknown;
};

// Re-issue once a valid token has passed half its lifetime. Verification has
// already rejected expired tokens, so this only ever extends a live session.
export function shouldRefreshSession(payload: RefreshablePayload, now: number = Date.now()): boolean {
  if (typeof payload.iat !== "number") return false;
  return now - payload.iat * 1000 > SESSION_DURATION_MS / 2;
}

// Fresh claims with a new issued-at / expiry window, preserving identity claims.
export function buildRefreshedClaims(payload: RefreshablePayload, now: number = Date.now()): Record<string, unknown> {
  const nowSec = Math.floor(now / 1000);
  const next: Record<string, unknown> = { ...payload };
  delete next.iat;
  delete next.exp;
  next.expires = now + SESSION_DURATION_MS;
  next.iat = nowSec;
  next.exp = Math.floor((now + SESSION_DURATION_MS) / 1000);
  return next;
}
