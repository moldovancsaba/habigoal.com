// Oura OAuth2 authorization-code exchange. The live token endpoint is gated on
// configured credentials; without them the connect flow reports "not configured"
// (HTTP 501) rather than failing opaquely. Secrets and codes are never logged.

import { env } from "@/config/env";

export const OURA_AUTHORIZE_URL = "https://cloud.ouraring.com/oauth/authorize";
export const OURA_DEFAULT_SCOPES = ["daily", "heartrate", "personal"];
const TOKEN_TIMEOUT_MS = 5000;
const TOKEN_RETRIES = 2;

export type OuraTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
};

export function isOuraOAuthConfigured(): boolean {
  return Boolean(env.ouraClientId && env.ouraClientSecret);
}

export function buildOuraAuthorizeUrl(input: { redirectUri: string; state: string; scopes?: string[] }): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: env.ouraClientId as string,
    redirect_uri: input.redirectUri,
    state: input.state,
    scope: (input.scopes ?? OURA_DEFAULT_SCOPES).join(" ")
  });
  return `${OURA_AUTHORIZE_URL}?${params.toString()}`;
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
        lastError = new Error(`Oura token endpoint responded ${response.status}`);
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
  throw lastError instanceof Error ? lastError : new Error("Oura token request failed");
}

// Exchanges an authorization code for tokens. Throws on transport failure or a
// non-OK provider response; callers map that to a graceful error redirect.
export async function exchangeOuraAuthCode(code: string, redirectUri: string): Promise<OuraTokenResponse> {
  if (!isOuraOAuthConfigured()) {
    throw new Error("OURA_NOT_CONFIGURED");
  }
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: env.ouraClientId as string,
    client_secret: env.ouraClientSecret as string
  }).toString();

  const response = await postWithTimeout(`${env.ouraApiBaseUrl}/oauth/token`, body, TOKEN_TIMEOUT_MS, TOKEN_RETRIES);
  if (!response.ok) {
    throw new Error(`exchange_failed_${response.status}`);
  }
  const token = (await response.json()) as OuraTokenResponse;
  if (!token.access_token) {
    throw new Error("exchange_failed_no_token");
  }
  return token;
}

export function computeExpiryIso(expiresIn: number | undefined, now: Date = new Date()): string | undefined {
  return typeof expiresIn === "number" && Number.isFinite(expiresIn) ? new Date(now.getTime() + expiresIn * 1000).toISOString() : undefined;
}
