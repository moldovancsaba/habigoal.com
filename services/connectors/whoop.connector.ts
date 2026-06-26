import { WearableConnector, DeviceConnection } from "../../types/wearable-connector";
import { RawPayload } from "../../types/canonical-metric";

export class WhoopConnector implements WearableConnector {
  source = 'whoop' as const;

  async fetchMetrics(connection: DeviceConnection, from: string, to: string): Promise<RawPayload[]> {
    throw new Error(`Whoop connector is not configured for live API fetches (${connection.connectionId}, ${from} to ${to}).`);
  }

  async refreshTokenIfNeeded(connection: DeviceConnection): Promise<DeviceConnection> {
    throw new Error(`Whoop token refresh is not configured for ${connection.connectionId}.`);
  }

  async healthCheck(_connection: DeviceConnection): Promise<boolean> {
    return false;
  }

  async revokeAccess(connection: DeviceConnection): Promise<void> {
    console.log(`Revoking Whoop access for ${connection.connectionId}`);
  }
}
