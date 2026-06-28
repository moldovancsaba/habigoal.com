import { WearableConnector, DeviceConnection } from "../../types/wearable-connector";
import { RawPayload } from "../../types/canonical-metric";
import { env } from "@/config/env";
import { decryptToken, encryptToken } from "@/lib/wearable-token-crypto";
import { isGarminOAuthConfigured } from "@/lib/garmin-oauth";
import { updateTokens } from "@/repositories/device-connection.repository";

// Garmin connector (Health API). Live network paths are gated on configured
// OAuth credentials; without them the connector reports "not configured" rather
// than pretending to sync. Tokens are decrypted in-memory only and never logged.

const FETCH_TIMEOUT_MS = 5000;
const FETCH_RETRIES = 2;

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number, retries: number): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { ...init, signal: controller.signal });
      clearTimeout(timer);
      if (response.status === 429 || response.status >= 500) {
        lastError = new Error(`Garmin API responded ${response.status}`);
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
  throw lastError instanceof Error ? lastError : new Error("Garmin request failed");
}

export class GarminConnector implements WearableConnector {
  source = "garmin" as const;

  async fetchMetrics(connection: DeviceConnection, from: string, to: string): Promise<RawPayload[]> {
    if (!isGarminOAuthConfigured()) {
      throw new Error(`Garmin connector is not configured for live API fetches (${connection.connectionId}).`);
    }
    const accessToken = decryptToken(connection.accessToken);
    const startSec = Math.floor(new Date(from).getTime() / 1000);
    const endSec = Math.floor(new Date(to).getTime() / 1000);
    const receivedAt = new Date().toISOString();
    const payloads: RawPayload[] = [];

    const resources: Array<{ garminType: string; path: string }> = [
      { garminType: "dailies", path: "/wellness-api/rest/dailies" },
      { garminType: "hrv", path: "/wellness-api/rest/hrv" },
      { garminType: "sleep", path: "/wellness-api/rest/sleeps" }
    ];

    for (const resource of resources) {
      const url = `${env.garminApiBaseUrl}${resource.path}?uploadStartTimeInSeconds=${startSec}&uploadEndTimeInSeconds=${endSec}`;
      const response = await fetchWithTimeout(url, { headers: { Authorization: `Bearer ${accessToken}` } }, FETCH_TIMEOUT_MS, FETCH_RETRIES);
      if (!response.ok) {
        throw new Error(`Garmin ${resource.garminType} fetch failed with status ${response.status}`);
      }
      const records = (await response.json()) as Array<Record<string, unknown>>;
      for (const record of Array.isArray(records) ? records : []) {
        const day = typeof record.calendarDate === "string" ? record.calendarDate : "";
        payloads.push({
          payloadId: `${connection.athleteId}:garmin:${resource.garminType}:${day}`,
          athleteId: connection.athleteId,
          source: "garmin",
          receivedAt,
          payload: { garminType: resource.garminType, day, ...record },
          normalised: false
        });
      }
    }

    return payloads;
  }

  async refreshTokenIfNeeded(connection: DeviceConnection): Promise<DeviceConnection> {
    if (!isGarminOAuthConfigured()) {
      throw new Error(`Garmin token refresh is not configured for ${connection.connectionId}.`);
    }
    if (!connection.refreshToken) {
      throw new Error(`Garmin connection ${connection.connectionId} has no refresh token; reconnect required.`);
    }
    const refreshToken = decryptToken(connection.refreshToken);
    const response = await fetchWithTimeout(
      env.garminTokenUrl as string,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: refreshToken,
          client_id: env.garminClientId as string,
          client_secret: env.garminClientSecret as string
        }).toString()
      },
      FETCH_TIMEOUT_MS,
      FETCH_RETRIES
    );
    if (!response.ok) {
      throw new Error(`Garmin token refresh failed with status ${response.status}`);
    }
    const token = (await response.json()) as { access_token?: string; refresh_token?: string; expires_in?: number };
    if (!token.access_token) {
      throw new Error("Garmin token refresh returned no access token");
    }
    const tokenExpiresAt = token.expires_in ? new Date(Date.now() + token.expires_in * 1000).toISOString() : undefined;
    return updateTokens(
      connection.connectionId,
      encryptToken(token.access_token),
      token.refresh_token ? encryptToken(token.refresh_token) : undefined,
      tokenExpiresAt
    );
  }

  async healthCheck(connection: DeviceConnection): Promise<boolean> {
    void connection;
    return isGarminOAuthConfigured();
  }

  async revokeAccess(connection: DeviceConnection): Promise<void> {
    void connection;
  }
}
