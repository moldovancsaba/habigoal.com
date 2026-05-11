import { MongoClient } from "mongodb";
import { env } from "@/config/env";

declare global {
  var surveyMongoClient: Promise<MongoClient> | undefined;
}

export async function getMongoClient(): Promise<MongoClient> {
  if (!env.mongodbUri) {
    throw new Error("MONGODB_URI is not configured");
  }

  if (!global.surveyMongoClient) {
    global.surveyMongoClient = new MongoClient(env.mongodbUri, {
      appName: env.mongodbAppName,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000
    }).connect();
  }

  return global.surveyMongoClient;
}

export async function getDatabase() {
  const client = await getMongoClient();
  return client.db(env.mongodbDb);
}

export async function pingDatabase() {
  const db = await getDatabase();
  return db.command({ ping: 1 });
}
