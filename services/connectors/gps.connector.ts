import { WearableConnector, DeviceConnection } from "../../types/wearable-connector";
import { RawPayload } from "../../types/canonical-metric";

export class CatapultConnector implements WearableConnector {
  source = 'catapult' as const;

  async fetchMetrics(connection: DeviceConnection, from: string, to: string): Promise<RawPayload[]> {
    console.log(`Fetching Catapult metrics for ${connection.connectionId}`);
    return [{
      payloadId: `${connection.athleteId}:${from}:catapult:session`,
      athleteId: connection.athleteId,
      source: 'catapult',
      receivedAt: new Date().toISOString(),
      payload: {
        total_distance: 7500,
        high_speed_running: 850
      },
      normalised: false
    }];
  }

  async refreshTokenIfNeeded(connection: DeviceConnection): Promise<DeviceConnection> { return connection; }
  async healthCheck(connection: DeviceConnection): Promise<boolean> { return true; }
  async revokeAccess(connection: DeviceConnection): Promise<void> {}
}

export class StatSportsConnector implements WearableConnector {
  source = 'statsports' as const;

  async fetchMetrics(connection: DeviceConnection, from: string, to: string): Promise<RawPayload[]> {
    console.log(`Fetching STATSports metrics for ${connection.connectionId}`);
    return [{
      payloadId: `${connection.athleteId}:${from}:statsports:session`,
      athleteId: connection.athleteId,
      source: 'statsports',
      receivedAt: new Date().toISOString(),
      payload: {
        total_distance: 7200,
        high_speed_running: 910
      },
      normalised: false
    }];
  }

  async refreshTokenIfNeeded(connection: DeviceConnection): Promise<DeviceConnection> { return connection; }
  async healthCheck(connection: DeviceConnection): Promise<boolean> { return true; }
  async revokeAccess(connection: DeviceConnection): Promise<void> {}
}
