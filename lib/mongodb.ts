import { MongoClient } from "mongodb";
import { env } from "@/config/env";

declare global {
  var surveyMongoClient: Promise<MongoClient> | undefined;
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
      global.surveyMongoClient = undefined;
      throw error;
    });
}

export async function getMongoClient(): Promise<MongoClient> {
  if (!env.mongodbUri) {
    throw new Error("MONGODB_URI is not configured");
  }

  if (!global.surveyMongoClient) {
    global.surveyMongoClient = createMongoClientPromise();
  }

  try {
    return await global.surveyMongoClient;
  } catch (error) {
    global.surveyMongoClient = undefined;
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
    global.surveyMongoClient = undefined;
    const db = await getDatabase();
    return await db.command({ ping: 1 });
  }
}
