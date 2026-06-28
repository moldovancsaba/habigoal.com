import { WearableConnector, DeviceConnection } from "../../types/wearable-connector";
import { RawPayload } from "../../types/canonical-metric";
import { env } from "@/config/env";
import { decryptToken, encryptToken } from "@/lib/wearable-token-crypto";
import { isWhoopOAuthConfigured } from "@/lib/whoop-oauth";
import { updateTokens } from "@/repositories/device-connection.repository";

// Whoop connector (API v1). Live network paths are gated on configured OAuth
// credentials; without them the connector reports "not configured" rather than
// pretending to sync. Tokens are decrypted in-memory only and never logged.

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
        lastError = new Error(`Whoop API responded ${response.status}`);
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
  throw lastError instanceof Error ? lastError : new Error("Whoop request failed");
}

export class WhoopConnector implements WearableConnector {
  source = "whoop" as const;

  async fetchMetrics(connection: DeviceConnection, from: string, to: string): Promise<RawPayload[]> {
    if (!isWhoopOAuthConfigured()) {
      throw new Error(`Whoop connector is not configured for live API fetches (${connection.connectionId}).`);
    }
    const accessToken = decryptToken(connection.accessToken);
    const start = new Date(from).toISOString();
    const end = new Date(to).toISOString();
    const receivedAt = new Date().toISOString();
    const payloads: RawPayload[] = [];

    const resources: Array<{ whoopType: string; path: string; map: (record: Record<string, unknown>) => Record<string, unknown> }> = [
      {
        whoopType: "recovery",
        path: "/developer/v1/recovery",
        map: (r) => {
          const score = (r.score ?? {}) as Record<string, unknown>;
          return { day: String(r.created_at ?? "").slice(0, 10), recovery_score: score.recovery_score, resting_heart_rate: score.resting_heart_rate, hrv_rmssd_milli: score.hrv_rmssd_milli };
        }
      },
      {
        whoopType: "sleep",
        path: "/developer/v1/activity/sleep",
        map: (r) => {
          const score = (r.score ?? {}) as Record<string, unknown>;
          const stage = (score.stage_summary ?? {}) as Record<string, unknown>;
          const totalMilli = typeof stage.total_in_bed_time_milli === "number" ? stage.total_in_bed_time_milli : undefined;
          return { day: String(r.start ?? "").slice(0, 10), sleep_performance_percentage: score.sleep_performance_percentage, total_sleep_minutes: totalMilli !== undefined ? Math.round(totalMilli / 60000) : undefined };
        }
      }
    ];

    for (const resource of resources) {
      const url = `${env.whoopApiBaseUrl}${resource.path}?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`;
      const response = await fetchWithTimeout(url, { headers: { Authorization: `Bearer ${accessToken}` } }, FETCH_TIMEOUT_MS, FETCH_RETRIES);
      if (!response.ok) {
        throw new Error(`Whoop ${resource.whoopType} fetch failed with status ${response.status}`);
      }
      const json = (await response.json()) as { records?: Array<Record<string, unknown>> };
      for (const record of json.records ?? []) {
        const mapped = resource.map(record);
        payloads.push({
          payloadId: `${connection.athleteId}:whoop:${resource.whoopType}:${mapped.day}`,
          athleteId: connection.athleteId,
          source: "whoop",
          receivedAt,
          payload: { whoopType: resource.whoopType, ...mapped },
          normalised: false
        });
      }
    }

    return payloads;
  }

  async refreshTokenIfNeeded(connection: DeviceConnection): Promise<DeviceConnection> {
    if (!isWhoopOAuthConfigured()) {
      throw new Error(`Whoop token refresh is not configured for ${connection.connectionId}.`);
    }
    if (!connection.refreshToken) {
      throw new Error(`Whoop connection ${connection.connectionId} has no refresh token; reconnect required.`);
    }
    const refreshToken = decryptToken(connection.refreshToken);
    const response = await fetchWithTimeout(
      `${env.whoopApiBaseUrl}/oauth/oauth2/token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: refreshToken,
          client_id: env.whoopClientId as string,
          client_secret: env.whoopClientSecret as string,
          scope: "offline"
        }).toString()
      },
      FETCH_TIMEOUT_MS,
      FETCH_RETRIES
    );
    if (!response.ok) {
      throw new Error(`Whoop token refresh failed with status ${response.status}`);
    }
    const token = (await response.json()) as { access_token?: string; refresh_token?: string; expires_in?: number };
    if (!token.access_token) {
      throw new Error("Whoop token refresh returned no access token");
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
    return isWhoopOAuthConfigured();
  }

  async revokeAccess(connection: DeviceConnection): Promise<void> {
    void connection;
  }
}
