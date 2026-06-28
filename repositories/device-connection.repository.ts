import { getDatabase } from "@/lib/mongodb";
import { DeviceConnection } from "../types/wearable-connector";
import { MetricSource } from "../types/canonical-metric";

const COLLECTION_NAME = "device_connections";

export async function findConnectionByAthleteAndSource(
  athleteId: string,
  source: MetricSource
): Promise<DeviceConnection | null> {
  const db = await getDatabase();
  const collection = db.collection<DeviceConnection>(COLLECTION_NAME);
  return await collection.findOne({ athleteId, source });
}

export async function findConnectionsByAthleteId(athleteId: string): Promise<DeviceConnection[]> {
  const db = await getDatabase();
  const collection = db.collection<DeviceConnection>(COLLECTION_NAME);
  return await collection.find({ athleteId }).toArray();
}

export async function findConnectionById(connectionId: string): Promise<DeviceConnection | null> {
  const db = await getDatabase();
  const collection = db.collection<DeviceConnection>(COLLECTION_NAME);
  return await collection.findOne({ connectionId });
}

export async function upsertDeviceConnection(connection: DeviceConnection): Promise<void> {
  const db = await getDatabase();
  const collection = db.collection(COLLECTION_NAME);

  const filter = { connectionId: connection.connectionId };
  const update = {
    $set: {
      ...connection,
      updatedAt: new Date().toISOString(),
    },
    $setOnInsert: {
      createdAt: new Date().toISOString(),
    },
  };

  await collection.updateOne(filter, update, { upsert: true });
}

export async function updateTokens(
  connectionId: string,
  accessToken: string,
  refreshToken?: string,
  tokenExpiresAt?: string
): Promise<DeviceConnection> {
  const db = await getDatabase();
  const collection = db.collection<DeviceConnection>(COLLECTION_NAME);

  const updateDoc: Record<string, unknown> = {
    accessToken,
    updatedAt: new Date().toISOString(),
  };
  if (refreshToken) updateDoc.refreshToken = refreshToken;
  if (tokenExpiresAt) updateDoc.tokenExpiresAt = tokenExpiresAt;

  const result = await collection.findOneAndUpdate(
    { connectionId },
    { $set: updateDoc },
    { returnDocument: "after" }
  );

  if (!result) {
    throw new Error("Device connection not found");
  }

  return result as unknown as DeviceConnection;
}

export async function updateConnectionStatus(
  connectionId: string,
  status: DeviceConnection["status"],
  errorMsg?: string
): Promise<void> {
  const db = await getDatabase();
  const collection = db.collection(COLLECTION_NAME);

  const updateDoc: Record<string, unknown> = {
    status,
    updatedAt: new Date().toISOString(),
  };

  if (errorMsg) {
    updateDoc.lastSyncError = errorMsg;
  } else if (status === "active") {
    updateDoc.lastSyncError = null;
    updateDoc.lastSyncAt = new Date().toISOString();
  }

  await collection.updateOne({ connectionId }, { $set: updateDoc });
}

// Records the outcome of a sync run. On success, stamps lastSyncAt and clears
// any prior error; on failure, records the error but keeps the prior lastSyncAt.
export async function recordSyncResult(
  connectionId: string,
  status: "ok" | "error",
  syncedAt: string,
  errorMsg?: string
): Promise<void> {
  const db = await getDatabase();
  const collection = db.collection(COLLECTION_NAME);

  const updateDoc: Record<string, unknown> = {
    lastSyncStatus: status,
    updatedAt: new Date().toISOString(),
  };
  if (status === "ok") {
    updateDoc.lastSyncAt = syncedAt;
    updateDoc.lastSyncError = null;
  } else {
    updateDoc.lastSyncError = errorMsg ?? "sync failed";
  }

  await collection.updateOne({ connectionId }, { $set: updateDoc });
}

// Active connections eligible for scheduled syncing.
export async function listSyncableConnections(): Promise<DeviceConnection[]> {
  const db = await getDatabase();
  const collection = db.collection<DeviceConnection>(COLLECTION_NAME);
  return await collection.find({ status: "active" }).toArray();
}
