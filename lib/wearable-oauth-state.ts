// CSRF `state` for the wearable OAuth round-trip. The state is an HMAC-signed
// payload binding the flow to an athlete, provider, and locale with a short TTL.
// The provider redirect receives only the public binding. The httpOnly cookie
// carries the same binding plus any PKCE verifier required by the provider.
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
};

export type WearableOAuthCookieBinding = WearableOAuthBinding & {
  codeVerifier?: string;
};

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

function sign(payloadB64: string, secret: string): string {
  return createHmac("sha256", secret).update(payloadB64).digest("base64url");
}

export function signWearableState(binding: WearableOAuthBinding | WearableOAuthCookieBinding, secret: string): string {
  const payloadB64 = base64url(JSON.stringify(binding));
  return `${payloadB64}.${sign(payloadB64, secret)}`;
}

export function createWearableState(
  input: { athleteId: string; provider: string; locale: string; nonce: string },
  secret: string,
  now: Date = new Date()
): string {
  return signWearableState(
    { athleteId: input.athleteId, provider: input.provider, locale: input.locale, nonce: input.nonce, exp: now.getTime() + WEARABLE_OAUTH_STATE_TTL_MS },
    secret
  );
}

export function createWearableCookieState(
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
  const binding = verifySignedWearableState(token, secret, now);
  if (!binding || "codeVerifier" in binding) return null;
  return binding;
}

export function verifyWearableCookieState(token: string | undefined | null, secret: string, now: Date = new Date()): WearableOAuthCookieBinding | null {
  return verifySignedWearableState(token, secret, now);
}

function verifySignedWearableState(
  token: string | undefined | null,
  secret: string,
  now: Date = new Date()
): WearableOAuthCookieBinding | null {
  if (!token || typeof token !== "string") return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const payloadB64 = token.slice(0, dot);
  const signature = token.slice(dot + 1);

  const expected = sign(payloadB64, secret);
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) return null;

  let binding: WearableOAuthCookieBinding;
  try {
    binding = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf-8"));
  } catch {
    return null;
  }
  if (!binding || typeof binding.athleteId !== "string" || typeof binding.provider !== "string" || typeof binding.nonce !== "string") return null;
  if (typeof binding.exp !== "number" || binding.exp <= now.getTime()) return null;
  if ("codeVerifier" in binding && binding.codeVerifier !== undefined && typeof binding.codeVerifier !== "string") return null;
  return binding;
}
