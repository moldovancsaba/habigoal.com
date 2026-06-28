import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CatapultConnector, StatSportsConnector } from "@/services/connectors/gps.connector";
import type { DeviceConnection } from "@/types/wearable-connector";

const connection: DeviceConnection = {
  connectionId: "c1",
  athleteId: "a1",
  organisationId: "o1",
  source: "catapult",
  status: "active",
  externalUserId: "ext1",
  scopes: [],
  accessToken: "token",
  syncIntervalHours: 24,
  createdAt: "2026-06-28T00:00:00.000Z",
  updatedAt: "2026-06-28T00:00:00.000Z",
};

describe("GPS connectors no longer fabricate data (#350)", () => {
  it("the source file contains no hardcoded session metrics", () => {
    const src = readFileSync(join(process.cwd(), "services/connectors/gps.connector.ts"), "utf8");
    for (const n of ["7500", "850", "7200", "910"]) {
      expect(src).not.toContain(n);
    }
    expect(src).not.toContain("total_distance: 7");
  });

  it("fetchMetrics returns no fabricated data", async () => {
    expect(await new CatapultConnector().fetchMetrics(connection, "2026-06-01", "2026-06-07")).toEqual([]);
    expect(await new StatSportsConnector().fetchMetrics(connection, "2026-06-01", "2026-06-07")).toEqual([]);
  });

  it("healthCheck is false when the gpsIngestion capability is off (default)", async () => {
    // Capability defaults off in test env → not really connected → unhealthy.
    expect(await new CatapultConnector().healthCheck(connection)).toBe(false);
    expect(await new StatSportsConnector().healthCheck(connection)).toBe(false);
  });
});
