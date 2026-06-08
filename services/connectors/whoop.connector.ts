import { WearableConnector, DeviceConnection } from "../../types/wearable-connector";
import { RawPayload } from "../../types/canonical-metric";

export class WhoopConnector implements WearableConnector {
  source = 'whoop' as const;

  async fetchMetrics(connection: DeviceConnection, from: string, to: string): Promise<RawPayload[]> {
    console.log(`Fetching Whoop metrics for connection ${connection.connectionId} from ${from} to ${to}`);
    
    // Mock Whoop API response
    const mockPayload = {
      created_at: `${from}T08:00:00Z`,
      score: {
        recovery_score: 85,
        strain: 12.4
      }
    };

    return [{
      payloadId: `${connection.athleteId}:${from}:whoop:cycle`,
      athleteId: connection.athleteId,
      source: 'whoop',
      receivedAt: new Date().toISOString(),
      payload: mockPayload,
      normalised: false
    }];
  }

  async refreshTokenIfNeeded(connection: DeviceConnection): Promise<DeviceConnection> {
    // Assuming mock valid token
    return connection;
  }

  async healthCheck(connection: DeviceConnection): Promise<boolean> {
    return connection.status === 'active';
  }

  async revokeAccess(connection: DeviceConnection): Promise<void> {
    console.log(`Revoking Whoop access for ${connection.connectionId}`);
  }
}
