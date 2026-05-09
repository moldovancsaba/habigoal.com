import { existsSync, readFileSync } from "node:fs";
import { MongoClient } from "mongodb";

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  const content = readFileSync(path, "utf8");
  for (const line of content.split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#")) continue;
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key]) continue;
    process.env[key] = rawValue.replace(/^["']|["']$/g, "");
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env.example");

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "survey";

if (!uri) {
  console.error("MONGODB_URI is missing. Add it to .env.local before running db:setup.");
  process.exit(1);
}

const client = new MongoClient(uri, {
  serverSelectionTimeoutMS: 10000,
  connectTimeoutMS: 10000
});

try {
  await client.connect();
  const db = client.db(dbName);
  const existing = await db.listCollections({ name: "assessments" }).toArray();
  if (existing.length === 0) {
    await db.createCollection("assessments");
  }

  const assessments = db.collection("assessments");
  await assessments.createIndexes([
    { key: { updatedAt: -1 }, name: "updatedAt_desc" },
    { key: { createdAt: -1 }, name: "createdAt_desc" },
    { key: { "child.name": 1 }, name: "child_name_asc" },
    { key: { "session.date": -1 }, name: "session_date_desc" },
    { key: { mode: 1, "session.date": -1 }, name: "mode_session_date" },
    { key: { "computed.ski": -1 }, name: "computed_ski_desc", sparse: true }
  ]);

  await db.collection("system").updateOne(
    { _id: "database-setup" },
    {
      $set: {
        app: "survey",
        dbName,
        collections: ["assessments"],
        updatedAt: new Date().toISOString()
      },
      $setOnInsert: {
        createdAt: new Date().toISOString()
      }
    },
    { upsert: true }
  );

  const indexes = await assessments.indexes();
  console.log(JSON.stringify({
    ok: true,
    database: dbName,
    collections: ["assessments"],
    assessmentIndexes: indexes.map((index) => index.name).sort()
  }, null, 2));
} finally {
  await client.close();
}
