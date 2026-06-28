// CSRF `state` for the wearable OAuth round-trip. The state is an HMAC-signed
// payload binding the flow to an athlete, provider, and locale with a short TTL.
// It is carried both in the provider redirect (`state` query) and in an httpOnly
// cookie; the callback requires both and that they match (double-submit), then
// clears the cookie so the state is single-use within the browser session.
//
// Pure and dependency-free (Node crypto only) so it is unit-testable in isolation.

import { createHmac, timingSafeEqual } from "crypto";

export const WEARABLE_OAUTH_STATE_COOKIE = "wearable_oauth_state";
export const WEARABLE_OAUTH_STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export type WearableOAuthBinding = {
  athleteId: string;
  provider: string;
  locale: string;
  nonce: string;
  exp: number; // epoch ms
  // PKCE code_verifier for providers that require it (e.g. Garmin). Carried in
  // the signed, httpOnly state cookie only — never exposed to the browser/URL.
  codeVerifier?: string;
};

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

function sign(payloadB64: string, secret: string): string {
  return createHmac("sha256", secret).update(payloadB64).digest("base64url");
}

export function signWearableState(binding: WearableOAuthBinding, secret: string): string {
  const payloadB64 = base64url(JSON.stringify(binding));
  return `${payloadB64}.${sign(payloadB64, secret)}`;
}

export function createWearableState(
  input: { athleteId: string; provider: string; locale: string; nonce: string; codeVerifier?: string },
  secret: string,
  now: Date = new Date()
): string {
  return signWearableState(
    { athleteId: input.athleteId, provider: input.provider, locale: input.locale, nonce: input.nonce, exp: now.getTime() + WEARABLE_OAUTH_STATE_TTL_MS, codeVerifier: input.codeVerifier },
    secret
  );
}

// Verifies signature and expiry and returns the binding, or null if the token is
// malformed, tampered, expired, or signed with a different secret.
export function verifyWearableState(token: string | undefined | null, secret: string, now: Date = new Date()): WearableOAuthBinding | null {
  if (!token || typeof token !== "string") return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const payloadB64 = token.slice(0, dot);
  const signature = token.slice(dot + 1);

  const expected = sign(payloadB64, secret);
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) return null;

  let binding: WearableOAuthBinding;
  try {
    binding = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf-8"));
  } catch {
    return null;
  }
  if (!binding || typeof binding.athleteId !== "string" || typeof binding.provider !== "string" || typeof binding.nonce !== "string") return null;
  if (typeof binding.exp !== "number" || binding.exp <= now.getTime()) return null;
  return binding;
}
