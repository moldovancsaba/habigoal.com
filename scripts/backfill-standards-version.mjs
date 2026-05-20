import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "habigoal";

if (!uri) {
  console.error("Missing MONGODB_URI");
  process.exit(1);
}

const client = new MongoClient(uri);

try {
  await client.connect();
  const db = client.db(dbName);
  const settings = await db.collection("settings").findOne({ _id: "global_settings" });
  const activeVersion = settings?.standards?.activeVersion || "v1";

  const result = await db.collection("assessments").updateMany(
    { standardsVersionUsed: { $exists: false } },
    { $set: { standardsVersionUsed: activeVersion, updatedAt: new Date().toISOString() }, $push: { updateHistory: `backfill:standardsVersionUsed:${activeVersion}:${new Date().toISOString()}` } }
  );

  console.log(`Backfilled ${result.modifiedCount} assessments with standardsVersionUsed=${activeVersion}`);
} finally {
  await client.close();
}
