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
const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "survey";

if (!uri) {
  console.error("MONGODB_URI is missing. Add it to .env.local before running the daily tracker backfill.");
  process.exit(1);
}

const client = new MongoClient(uri, {
  serverSelectionTimeoutMS: 10000,
  connectTimeoutMS: 10000
});

const trackerKeys = [
  "sleep_hours",
  "sleep_quality",
  "energy_level",
  "body_feel",
  "fuel_hydration",
  "mood_state",
  "stress_load",
  "confidence_level",
  "focus_level"
];

function normalizeLegacyScore(value) {
  if (typeof value !== "number") return null;
  if (value === 6) return 5;
  return clamp(round1(value), 1, 5);
}

function normalizeReadyCheck(value) {
  if (typeof value !== "number") return null;
  if (value >= 6) return 5;
  return clamp(round1(value), 1, 5);
}

function round1(value) {
  return Math.round(value * 10) / 10;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function average(values) {
  const valid = values.filter((value) => typeof value === "number");
  if (!valid.length) return null;
  return round1(valid.reduce((sum, value) => sum + value, 0) / valid.length);
}

function pick(...values) {
  for (const value of values) {
    if (typeof value === "number") return value;
  }
  return null;
}

function hasTrackerScores(scores = {}) {
  return trackerKeys.some((key) => typeof scores[key]?.score === "number");
}

function deriveTrackerScores(scores = {}) {
  const technical = normalizeLegacyScore(scores.technical_pillar?.score);
  const tactical = normalizeLegacyScore(scores.tactical_pillar?.score);
  const cognitive = normalizeLegacyScore(scores.cognitive_pillar?.score);
  const physical = normalizeLegacyScore(scores.physical_pillar?.score);
  const psychological = normalizeLegacyScore(scores.psychological_pillar?.score);
  const readiness = normalizeLegacyScore(scores.readiness_pillar?.score);

  const sleepRecovery = normalizeReadyCheck(scores.readiness_sleep_recovery?.score);
  const hydration = normalizeReadyCheck(scores.readiness_hydration?.score);
  const fuelQuality = normalizeReadyCheck(scores.readiness_fuel_quality?.score);
  const mentalState = normalizeReadyCheck(scores.readiness_mental_state?.score);
  const bodyStatus = normalizeReadyCheck(scores.readiness_body_status?.score);
  const energyActivation = normalizeReadyCheck(scores.readiness_energy_activation?.score);
  const sessionIntent = normalizeReadyCheck(scores.readiness_session_intent?.score);

  const derived = {
    sleep_hours: pick(sleepRecovery, average([physical, readiness]), physical, readiness),
    sleep_quality: pick(average([sleepRecovery, physical]), sleepRecovery, physical),
    energy_level: pick(average([energyActivation, physical, readiness]), energyActivation, physical, readiness),
    body_feel: pick(average([bodyStatus, physical]), bodyStatus, physical),
    fuel_hydration: pick(average([hydration, fuelQuality, physical]), average([hydration, physical]), hydration, fuelQuality, physical),
    mood_state: pick(average([mentalState, psychological]), mentalState, psychological),
    stress_load: pick(average([mentalState, readiness, psychological]), average([readiness, psychological]), psychological, readiness),
    confidence_level: pick(average([psychological, technical]), psychological, technical),
    focus_level: pick(average([sessionIntent, cognitive, tactical]), average([cognitive, tactical]), cognitive, tactical, sessionIntent)
  };

  return Object.fromEntries(
    Object.entries(derived).map(([key, value]) => [
      key,
      {
        score: typeof value === "number" ? value : "",
        note: typeof value === "number" ? "Historically mapped from legacy check-in." : "",
        observer: "",
        confidence: "medium"
      }
    ])
  );
}

function computeFromTracker(scores) {
  const groups = {
    movement: ["sleep_hours", "sleep_quality", "energy_level", "body_feel", "fuel_hydration"],
    social: ["mood_state", "stress_load", "confidence_level"],
    mental: ["focus_level"]
  };

  const movementAverage = average(groups.movement.map((key) => scores[key]?.score).filter((value) => typeof value === "number"));
  const socialAverage = average(groups.social.map((key) => scores[key]?.score).filter((value) => typeof value === "number"));
  const mentalAverage = average(groups.mental.map((key) => scores[key]?.score).filter((value) => typeof value === "number"));
  const ski = average([movementAverage, socialAverage, mentalAverage].filter((value) => typeof value === "number"));
  const done = trackerKeys.filter((key) => typeof scores[key]?.score === "number").length;

  return {
    movementAverage,
    socialAverage,
    mentalAverage,
    ski,
    completion: {
      done,
      total: trackerKeys.length
    }
  };
}

try {
  await client.connect();
  const db = client.db(dbName);
  const assessments = db.collection("assessments");
  const now = new Date().toISOString();

  const docs = await assessments.find({
    deletedAt: { $exists: false },
    $or: [
      { "scores.technical_pillar.score": { $type: "number" } },
      { "scores.readiness_pillar.score": { $type: "number" } }
    ]
  }).toArray();

  let eligible = 0;
  let changed = 0;
  const updates = [];

  for (const doc of docs) {
    if (hasTrackerScores(doc.scores)) continue;
    eligible += 1;
    const trackerScores = deriveTrackerScores(doc.scores);
    const hasDerivedValue = trackerKeys.some((key) => typeof trackerScores[key].score === "number");
    if (!hasDerivedValue) continue;

    const mergedScores = { ...doc.scores, ...trackerScores };
    const computed = computeFromTracker(mergedScores);
    const updateHistory = Array.isArray(doc.updateHistory) ? doc.updateHistory : [];

    updates.push({
      updateOne: {
        filter: { _id: doc._id },
        update: {
          $set: {
            scores: mergedScores,
            computed,
            updatedAt: now
          },
          $push: {
            updateHistory: `backfill:daily-tracker-history:${now}`
          }
        }
      }
    });
    changed += 1;
  }

  const summary = {
    ok: true,
    mode: dryRun ? "dry-run" : "write",
    database: dbName,
    scanned: docs.length,
    eligibleLegacyRecords: eligible,
    recordsToBackfill: changed
  };

  if (dryRun) {
    console.log(JSON.stringify(summary, null, 2));
    process.exit(0);
  }

  if (updates.length > 0) {
    await assessments.bulkWrite(updates);
  }

  console.log(JSON.stringify({
    ...summary,
    recordsBackfilled: updates.length
  }, null, 2));
} finally {
  await client.close();
}
