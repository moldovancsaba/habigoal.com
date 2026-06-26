import { WearableConnector, DeviceConnection } from "../../types/wearable-connector";
import { RawPayload } from "../../types/canonical-metric";

export class GarminConnector implements WearableConnector {
  source = 'garmin' as const;

  async fetchMetrics(connection: DeviceConnection, from: string, to: string): Promise<RawPayload[]> {
    throw new Error(`Garmin connector is not configured for live API fetches (${connection.connectionId}, ${from} to ${to}).`);
  }

  async refreshTokenIfNeeded(connection: DeviceConnection): Promise<DeviceConnection> {
    throw new Error(`Garmin token refresh is not configured for ${connection.connectionId}.`);
  }

  async healthCheck(_connection: DeviceConnection): Promise<boolean> {
    return false;
  }

  async revokeAccess(connection: DeviceConnection): Promise<void> {
    console.log(`Revoking Garmin access for ${connection.connectionId}`);
  }
}
