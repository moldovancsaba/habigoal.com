// Provider-agnostic registry for the wearable OAuth connect flow. The callback
// and the device-connect endpoint dispatch on the provider carried in the signed
// state, so adding a provider is just a new entry here + its OAuth module.

import { buildOuraAuthorizeUrl, exchangeOuraAuthCode, isOuraOAuthConfigured } from "@/lib/oura-oauth";
import { buildWhoopAuthorizeUrl, exchangeWhoopAuthCode, isWhoopOAuthConfigured, type WearableTokenResponse } from "@/lib/whoop-oauth";
import { buildGarminAuthorizeUrl, createGarminPkce, exchangeGarminAuthCode, isGarminOAuthConfigured } from "@/lib/garmin-oauth";

export type WearableOAuthProvider = {
  isConfigured: () => boolean;
  buildAuthorizeUrl: (input: { redirectUri: string; state: string; codeChallenge?: string }) => string;
  exchangeAuthCode: (code: string, redirectUri: string, codeVerifier?: string) => Promise<WearableTokenResponse>;
  // PKCE providers expose a verifier/challenge generator; the verifier is stored
  // in the signed state and the challenge is sent on the authorize URL.
  createPkce?: () => { verifier: string; challenge: string };
};

const PROVIDERS: Record<string, WearableOAuthProvider> = {
  oura: { isConfigured: isOuraOAuthConfigured, buildAuthorizeUrl: buildOuraAuthorizeUrl, exchangeAuthCode: exchangeOuraAuthCode },
  whoop: { isConfigured: isWhoopOAuthConfigured, buildAuthorizeUrl: buildWhoopAuthorizeUrl, exchangeAuthCode: exchangeWhoopAuthCode },
  garmin: { isConfigured: isGarminOAuthConfigured, buildAuthorizeUrl: buildGarminAuthorizeUrl, exchangeAuthCode: exchangeGarminAuthCode, createPkce: createGarminPkce }
};

export function getWearableOAuthProvider(provider: string): WearableOAuthProvider | null {
  return PROVIDERS[provider] ?? null;
}

// Absolute token expiry from an `expires_in` (seconds) value.
export function computeExpiryIso(expiresIn: number | undefined, now: Date = new Date()): string | undefined {
  return typeof expiresIn === "number" && Number.isFinite(expiresIn) ? new Date(now.getTime() + expiresIn * 1000).toISOString() : undefined;
}
