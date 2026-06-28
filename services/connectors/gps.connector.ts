import { WearableConnector, DeviceConnection } from "../../types/wearable-connector";
import { RawPayload } from "../../types/canonical-metric";
import { getCapabilities } from "@/lib/capabilities";

// GPS / team-tracking connectors (Catapult, STATSports) — #350.
//
// These previously returned HARDCODED session metrics (a fixed distance / high-
// speed-running figure), presenting fabricated data as real ingestion. That is
// removed. Until a real
// provider integration exists — gated by the `gpsIngestion` capability (#440)
// AND a credentialed, active connection — these honestly return NO data and
// report unhealthy, never invented numbers. The real CSV/API parsing lands when
// the integration is built; this is the honest-state scaffold.

function gpsReady(connection: DeviceConnection): boolean {
  return (
    getCapabilities().gpsIngestion &&
    connection.status === "active" &&
    Boolean(connection.accessToken)
  );
}

abstract class BaseGpsConnector implements WearableConnector {
  abstract source: "catapult" | "statsports";

  async fetchMetrics(_connection: DeviceConnection, _from: string, _to: string): Promise<RawPayload[]> {
    // No fabricated data. Real provider ingestion is added behind `gpsIngestion`;
    // until then there is genuinely nothing to return.
    return [];
  }

  async refreshTokenIfNeeded(connection: DeviceConnection): Promise<DeviceConnection> {
    return connection;
  }

  async healthCheck(connection: DeviceConnection): Promise<boolean> {
    return gpsReady(connection);
  }

  async revokeAccess(_connection: DeviceConnection): Promise<void> {}
}

export class CatapultConnector extends BaseGpsConnector {
  source = "catapult" as const;
}

export class StatSportsConnector extends BaseGpsConnector {
  source = "statsports" as const;
}
