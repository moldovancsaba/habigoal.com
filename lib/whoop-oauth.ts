// Whoop OAuth2 authorization-code exchange. Like the Oura connector, the live
// token endpoint is gated on configured credentials; without them the connect
// flow reports "not configured". Secrets and codes are never logged.

import { env } from "@/config/env";

export const WHOOP_AUTHORIZE_URL = "https://api.prod.whoop.com/oauth/oauth2/auth";
// `offline` is required for Whoop to return a refresh token.
export const WHOOP_DEFAULT_SCOPES = ["read:recovery", "read:cycles", "read:sleep", "read:workout", "offline"];
const TOKEN_TIMEOUT_MS = 5000;
const TOKEN_RETRIES = 2;

export type WearableTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
};

export function isWhoopOAuthConfigured(): boolean {
  return Boolean(env.whoopClientId && env.whoopClientSecret);
}

export function buildWhoopAuthorizeUrl(input: { redirectUri: string; state: string; scopes?: string[] }): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: env.whoopClientId as string,
    redirect_uri: input.redirectUri,
    state: input.state,
    scope: (input.scopes ?? WHOOP_DEFAULT_SCOPES).join(" ")
  });
  return `${WHOOP_AUTHORIZE_URL}?${params.toString()}`;
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
        lastError = new Error(`Whoop token endpoint responded ${response.status}`);
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
  throw lastError instanceof Error ? lastError : new Error("Whoop token request failed");
}

export async function exchangeWhoopAuthCode(code: string, redirectUri: string): Promise<WearableTokenResponse> {
  if (!isWhoopOAuthConfigured()) {
    throw new Error("WHOOP_NOT_CONFIGURED");
  }
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: env.whoopClientId as string,
    client_secret: env.whoopClientSecret as string
  }).toString();

  const response = await postWithTimeout(`${env.whoopApiBaseUrl}/oauth/oauth2/token`, body, TOKEN_TIMEOUT_MS, TOKEN_RETRIES);
  if (!response.ok) {
    throw new Error(`exchange_failed_${response.status}`);
  }
  const token = (await response.json()) as WearableTokenResponse;
  if (!token.access_token) {
    throw new Error("exchange_failed_no_token");
  }
  return token;
}
