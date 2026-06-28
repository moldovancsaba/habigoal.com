// Garmin OAuth2 (PKCE) authorization-code exchange. Garmin's Health API uses
// OAuth2 with PKCE: the connect leg generates a code_verifier (carried in the
// signed, httpOnly state cookie) and sends its S256 code_challenge; the callback
// exchanges code + verifier for tokens. Gated on configured credentials; secrets
// and codes are never logged.

import { createHash, randomBytes } from "crypto";
import { env } from "@/config/env";

export const GARMIN_DEFAULT_SCOPES = ["HEALTH_READ"];
const TOKEN_TIMEOUT_MS = 5000;
const TOKEN_RETRIES = 2;

export type WearableTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
};

export function isGarminOAuthConfigured(): boolean {
  return Boolean(env.garminClientId && env.garminClientSecret);
}

// PKCE: a high-entropy verifier and its S256 challenge.
export function createGarminPkce(): { verifier: string; challenge: string } {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

export function buildGarminAuthorizeUrl(input: { redirectUri: string; state: string; codeChallenge?: string; scopes?: string[] }): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: env.garminClientId as string,
    redirect_uri: input.redirectUri,
    state: input.state,
    scope: (input.scopes ?? GARMIN_DEFAULT_SCOPES).join(" ")
  });
  if (input.codeChallenge) {
    params.set("code_challenge", input.codeChallenge);
    params.set("code_challenge_method", "S256");
  }
  return `${env.garminAuthorizeUrl}?${params.toString()}`;
}

async function postWithTimeout(url: string, body: string, timeoutMs: number, retries: number): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
        signal: controller.signal
      });
      clearTimeout(timer);
      if (response.status === 429 || response.status >= 500) {
        lastError = new Error(`Garmin token endpoint responded ${response.status}`);
      } else {
        return response;
      }
    } catch (error) {
      clearTimeout(timer);
      lastError = error;
    }
    if (attempt < retries) {
      await new Promise((resolve) => setTimeout(resolve, 2 ** attempt * 250));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Garmin token request failed");
}

export async function exchangeGarminAuthCode(code: string, redirectUri: string, codeVerifier?: string): Promise<WearableTokenResponse> {
  if (!isGarminOAuthConfigured()) {
    throw new Error("GARMIN_NOT_CONFIGURED");
  }
  const params: Record<string, string> = {
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: env.garminClientId as string,
    client_secret: env.garminClientSecret as string
  };
  if (codeVerifier) params.code_verifier = codeVerifier;

  const response = await postWithTimeout(env.garminTokenUrl as string, new URLSearchParams(params).toString(), TOKEN_TIMEOUT_MS, TOKEN_RETRIES);
  if (!response.ok) {
    throw new Error(`exchange_failed_${response.status}`);
  }
  const token = (await response.json()) as WearableTokenResponse;
  if (!token.access_token) {
    throw new Error("exchange_failed_no_token");
  }
  return token;
}
