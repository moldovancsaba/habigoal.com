import fs from "node:fs";
import { MongoClient } from "mongodb";

function loadEnvFile(path) {
  try {
    if (!fs.existsSync(path)) return;
    const raw = fs.readFileSync(path, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // ignore env bootstrap failures; explicit process env still works
  }
}

loadEnvFile(".env");
loadEnvFile(".env.local");
loadEnvFile(".env.example");

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "survey";
const appName = process.env.MONGODB_APP_NAME || "habigoal-cli";

if (!uri) {
  console.error("MONGODB_URI is missing. Add your Atlas connection string to .env or .env.local first.");
  process.exit(1);
}

const client = new MongoClient(uri, {
  appName,
  maxPoolSize: 5,
  serverSelectionTimeoutMS: 10000
});

try {
  await client.connect();
  const db = client.db(dbName);
  await db.command({ ping: 1 });
  console.log(JSON.stringify({
    ok: true,
    database: dbName,
    appName
  }, null, 2));
} catch (error) {
  console.error(JSON.stringify({
    ok: false,
    database: dbName,
    appName,
    error: error instanceof Error ? error.message : String(error)
  }, null, 2));
  process.exit(1);
} finally {
  await client.close().catch(() => {});
}
