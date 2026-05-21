import { MongoClient } from "mongodb";
import { env } from "@/config/env";

declare global {
  var habigoalMongoClient: Promise<MongoClient> | undefined;
}

function createMongoClientPromise() {
  if (!env.mongodbUri) {
    throw new Error("MONGODB_URI is not configured");
  }

  return new MongoClient(env.mongodbUri, {
    appName: env.mongodbAppName,
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 10000
  })
    .connect()
    .catch((error) => {
      global.habigoalMongoClient = undefined;
      throw error;
    });
}

export async function getMongoClient(): Promise<MongoClient> {
  if (!env.mongodbUri) {
    throw new Error("MONGODB_URI is not configured");
  }

  if (!global.habigoalMongoClient) {
    global.habigoalMongoClient = createMongoClientPromise();
  }

  try {
    return await global.habigoalMongoClient;
  } catch (error) {
    global.habigoalMongoClient = undefined;
    throw error;
  }
}

export async function getDatabase() {
  const client = await getMongoClient();
  return client.db(env.mongodbDb);
}

export async function pingDatabase() {
  try {
    const db = await getDatabase();
    return await db.command({ ping: 1 });
  } catch {
    global.habigoalMongoClient = undefined;
    const db = await getDatabase();
    return await db.command({ ping: 1 });
  }
}
