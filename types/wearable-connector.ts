import { MetricSource, RawPayload } from "./canonical-metric";

export interface DeviceConnection {
  _id?: string;
  connectionId: string;
  athleteId: string;
  organisationId: string;
  source: MetricSource;
  status: 'active' | 'revoked' | 'error';
  externalUserId: string;
  scopes: string[];
  accessToken: string;           // AES-256-GCM encrypted
  refreshToken?: string;         // AES-256-GCM encrypted
  tokenExpiresAt?: string;
  lastSyncAt?: string;
  lastSyncError?: string;
  lastSyncStatus?: 'ok' | 'error' | 'never';
  syncIntervalHours: number;
  createdAt: string;
  updatedAt: string;
}

export interface WearableConnector {
  source: MetricSource;
  fetchMetrics(connection: DeviceConnection, from: string, to: string): Promise<RawPayload[]>;
  refreshTokenIfNeeded(connection: DeviceConnection): Promise<DeviceConnection>;
  healthCheck(connection: DeviceConnection): Promise<boolean>;
  revokeAccess(connection: DeviceConnection): Promise<void>;
}
