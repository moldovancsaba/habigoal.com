import { WearableConnector, DeviceConnection } from "../../types/wearable-connector";
import { RawPayload } from "../../types/canonical-metric";
import { env } from "@/config/env";
import { decryptToken, encryptToken } from "@/lib/wearable-token-crypto";
import { updateTokens } from "@/repositories/device-connection.repository";

// Oura Ring connector (API v2). The live network paths are gated on configured
// OAuth credentials; without them the connector reports "not configured" rather
// than pretending to sync. Tokens are decrypted in-memory only and never logged.

const OURA_RESOURCES = ["daily_sleep", "sleep", "daily_readiness"] as const;
const FETCH_TIMEOUT_MS = 5000;
const FETCH_RETRIES = 2;

function isConfigured(): boolean {
  return Boolean(env.ouraClientId && env.ouraClientSecret);
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number, retries: number): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { ...init, signal: controller.signal });
      clearTimeout(timer);
      if (response.status === 429 || response.status >= 500) {
        lastError = new Error(`Oura API responded ${response.status}`);
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
  throw lastError instanceof Error ? lastError : new Error("Oura request failed");
}

export class OuraConnector implements WearableConnector {
  source = "oura" as const;

  async fetchMetrics(connection: DeviceConnection, from: string, to: string): Promise<RawPayload[]> {
    if (!isConfigured()) {
      throw new Error(`Oura connector is not configured for live API fetches (${connection.connectionId}).`);
    }
    const accessToken = decryptToken(connection.accessToken);
    const startDate = from.slice(0, 10);
    const endDate = to.slice(0, 10);
    const receivedAt = new Date().toISOString();
    const payloads: RawPayload[] = [];

    for (const resource of OURA_RESOURCES) {
      const url = `${env.ouraApiBaseUrl}/v2/usercollection/${resource}?start_date=${startDate}&end_date=${endDate}`;
      const response = await fetchWithTimeout(url, { headers: { Authorization: `Bearer ${accessToken}` } }, FETCH_TIMEOUT_MS, FETCH_RETRIES);
      if (!response.ok) {
        throw new Error(`Oura ${resource} fetch failed with status ${response.status}`);
      }
      const json = (await response.json()) as { data?: Array<Record<string, unknown>> };
      for (const item of json.data ?? []) {
        const day = typeof item.day === "string" ? item.day : "";
        payloads.push({
          payloadId: `${connection.athleteId}:oura:${resource}:${day}`,
          athleteId: connection.athleteId,
          source: "oura",
          receivedAt,
          payload: { ouraType: resource, ...item },
          normalised: false
        });
      }
    }

    return payloads;
  }

  async refreshTokenIfNeeded(connection: DeviceConnection): Promise<DeviceConnection> {
    if (!isConfigured()) {
      throw new Error(`Oura token refresh is not configured for ${connection.connectionId}.`);
    }
    if (!connection.refreshToken) {
      throw new Error(`Oura connection ${connection.connectionId} has no refresh token; reconnect required.`);
    }
    const refreshToken = decryptToken(connection.refreshToken);
    const response = await fetchWithTimeout(
      `${env.ouraApiBaseUrl}/oauth/token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: refreshToken,
          client_id: env.ouraClientId as string,
          client_secret: env.ouraClientSecret as string
        }).toString()
      },
      FETCH_TIMEOUT_MS,
      FETCH_RETRIES
    );
    if (!response.ok) {
      throw new Error(`Oura token refresh failed with status ${response.status}`);
    }
    const token = (await response.json()) as { access_token?: string; refresh_token?: string; expires_in?: number };
    if (!token.access_token) {
      throw new Error("Oura token refresh returned no access token");
    }
    const tokenExpiresAt = token.expires_in ? new Date(Date.now() + token.expires_in * 1000).toISOString() : undefined;
    // Encrypt at rest before persisting; updateTokens returns the updated record.
    return updateTokens(
      connection.connectionId,
      encryptToken(token.access_token),
      token.refresh_token ? encryptToken(token.refresh_token) : undefined,
      tokenExpiresAt
    );
  }

  async healthCheck(connection: DeviceConnection): Promise<boolean> {
    void connection;
    return isConfigured();
  }

  async revokeAccess(connection: DeviceConnection): Promise<void> {
    // Oura has no token-revocation endpoint; the connection is marked revoked by
    // the caller. Nothing to call here beyond dropping local tokens.
    void connection;
  }
}
