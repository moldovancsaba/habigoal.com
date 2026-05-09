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

const args = new Set(process.argv.slice(2));
const dryRun = !args.has("--write");
const allowKidexDb = args.has("--allow-kidex-db");

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "survey";

if (!uri) {
  console.error("MONGODB_URI is missing. Add it to .env.local before running the identifier migration.");
  process.exit(1);
}

if (/^kidex$/i.test(dbName) && !allowKidexDb) {
  console.error(
    `Refusing to run against database "${dbName}". This safeguard exists to avoid modifying the original KIDEX data. ` +
    `If you intentionally need that target, rerun with --allow-kidex-db.`
  );
  process.exit(1);
}

const client = new MongoClient(uri, {
  serverSelectionTimeoutMS: 10000,
  connectTimeoutMS: 10000
});

const now = new Date().toISOString();

try {
  await client.connect();
  const db = client.db(dbName);
  const children = db.collection("children");
  const system = db.collection("system");

  const legacyOnlyFilter = {
    kidexId: { $exists: true, $type: "string" },
    $or: [{ surveyId: { $exists: false } }, { surveyId: "" }, { surveyId: null }]
  };

  const legacyAnyFilter = {
    kidexId: { $exists: true }
  };

  const legacyOnlyCount = await children.countDocuments(legacyOnlyFilter);
  const legacyAnyCount = await children.countDocuments(legacyAnyFilter);
  const setupBefore = await system.findOne({ _id: "database-setup" });

  const summary = {
    ok: true,
    mode: dryRun ? "dry-run" : "write",
    database: dbName,
    childrenWithLegacyKidexId: legacyAnyCount,
    childrenNeedingSurveyIdBackfill: legacyOnlyCount,
    systemAppBefore: setupBefore?.app ?? null
  };

  if (dryRun) {
    console.log(JSON.stringify(summary, null, 2));
    process.exit(0);
  }

  const updateResult = await children.updateMany(
    legacyAnyFilter,
    [
      {
        $set: {
          surveyId: {
            $cond: [
              {
                $or: [
                  { $eq: [{ $type: "$surveyId" }, "missing"] },
                  { $eq: ["$surveyId", null] },
                  { $eq: ["$surveyId", ""] }
                ]
              },
              "$kidexId",
              "$surveyId"
            ]
          },
          updatedAt: now
        }
      },
      { $unset: "kidexId" }
    ]
  );

  await system.updateOne(
    { _id: "database-setup" },
    {
      $set: {
        app: "survey",
        updatedAt: now
      }
    },
    { upsert: true }
  );

  console.log(JSON.stringify({
    ...summary,
    modifiedChildren: updateResult.modifiedCount,
    matchedChildren: updateResult.matchedCount,
    systemAppAfter: "survey"
  }, null, 2));
} finally {
  await client.close();
}
