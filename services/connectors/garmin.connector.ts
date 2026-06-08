import { WearableConnector, DeviceConnection } from "../../types/wearable-connector";
import { RawPayload } from "../../types/canonical-metric";

export class GarminConnector implements WearableConnector {
  source = 'garmin' as const;

  async fetchMetrics(connection: DeviceConnection, from: string, to: string): Promise<RawPayload[]> {
    console.log(`Fetching Garmin metrics for connection ${connection.connectionId} from ${from} to ${to}`);
    
    // Mock Garmin API response
    const mockPayload = {
      summaryDate: from,
      restingHeartRateInBeatsPerMinute: 55,
      averageStressLevel: 42
    };

    return [{
      payloadId: `${connection.athleteId}:${from}:garmin:daily`,
      athleteId: connection.athleteId,
      source: 'garmin',
      receivedAt: new Date().toISOString(),
      payload: mockPayload,
      normalised: false
    }];
  }

  async refreshTokenIfNeeded(connection: DeviceConnection): Promise<DeviceConnection> {
    // Garmin typically uses OAuth 1.0a or 2.0. Assuming token is valid.
    return connection;
  }

  async healthCheck(connection: DeviceConnection): Promise<boolean> {
    return connection.status === 'active';
  }

  async revokeAccess(connection: DeviceConnection): Promise<void> {
    console.log(`Revoking Garmin access for ${connection.connectionId}`);
  }
}
