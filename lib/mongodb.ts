import { MongoClient } from "mongodb";
import { env } from "@/config/env";

declare global {
  // eslint-disable-next-line no-var
  var kidexMongoClient: Promise<MongoClient> | undefined;
}

export async function getMongoClient(): Promise<MongoClient> {
  if (!env.mongodbUri) {
    throw new Error("MONGODB_URI is not configured");
  }

  if (!global.kidexMongoClient) {
    global.kidexMongoClient = new MongoClient(env.mongodbUri).connect();
  }

  return global.kidexMongoClient;
}

export async function getDatabase() {
  const client = await getMongoClient();
  return client.db(env.mongodbDb);
}
