import { existsSync, readFileSync } from "node:fs";
import { MongoClient } from "mongodb";

const root = process.cwd();
const GENERATED_BY = "haho-ecosystem-live-data-v1";
const expected = {
  athletes: 25,
  days: Number(process.env.HAHO_SEED_DAYS || 90),
  teams: 5,
  trainers: 5
};

function read(path) {
  return readFileSync(`${root}/${path}`, "utf8");
}

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  const content = readFileSync(path, "utf8");
  for (const line of content.split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#")) continue;
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key]) continue;
    process.env[key] = rawValue.trim().replace(/^["']|["']$/g, "");
  }
}

const failures = [];
const requiredFiles = [
  "scripts/seed-haho-ecosystem.mjs",
  "services/shared-daily-state.service.ts",
  "app/api/daily-state/route.ts",
  "app/api/aiq/trainer/dashboard/route.ts",
  "app/api/aiq/trainer/athletes/route.ts",
  "app/api/aiq/athlete/dashboard/route.ts",
  "components/product/athlete-iq/AthleteIqExperience.tsx",
  "components/product/habigoal/HabigoalExperience.tsx",
  "docs/haho-ecosystem-live-data.md"
];

for (const file of requiredFiles) {
  if (!existsSync(`${root}/${file}`)) failures.push(`Missing required artifact: ${file}`);
}

const packageJson = JSON.parse(read("package.json"));
for (const scriptName of ["db:seed-haho-ecosystem", "haho:release-gate", "test", "typecheck", "build"]) {
  if (!packageJson.scripts?.[scriptName]) failures.push(`package.json missing script: ${scriptName}`);
}

const bannedUiPatterns = [
  /\bdemo\b/i,
  /\bdemó\b/i,
  /\bpresentation\b/i,
  /\bprezentáció\b/i,
  /\blorem\s+ipsum\b/i
];
for (const file of [
  "app/[locale]/page.tsx",
  "app/[locale]/login/page.tsx",
  "components/product/habigoal/HabigoalExperience.tsx",
  "components/product/athlete-iq/AthleteIqExperience.tsx",
  "messages/en.json",
  "messages/hu.json"
]) {
  const source = read(file);
  for (const pattern of bannedUiPatterns) {
    if (pattern.test(source)) failures.push(`${file} contains banned production wording: ${pattern}`);
  }
}

const aiqExperience = read("components/product/athlete-iq/AthleteIqExperience.tsx");
for (const snippet of ["dashboard.persona === \"athlete\"", "AiqAthleteWorkspace", "ATHLETE_IQ_GDS_THEME_PRESET", "ATHLETE_IQ_GOLD_LOGO_SRC"]) {
  if (!aiqExperience.includes(snippet)) failures.push(`AIQ workspace missing marker: ${snippet}`);
}

const habigoalExperience = read("components/product/habigoal/HabigoalExperience.tsx");
for (const snippet of ["statusAvailable", "hbg-bottom-nav", "completeDailyOperation", "scoreEmptyExplanation"]) {
  if (!habigoalExperience.includes(snippet)) failures.push(`Habigoal mobile flow missing marker: ${snippet}`);
}

loadEnvFile(".env");
loadEnvFile(".env.local");

const mongoUri = process.env.MONGODB_URI;
const mongoDb = process.env.MONGODB_DB || "habigoal";
let atlas = null;

if (mongoUri && process.env.HAHO_RELEASE_GATE_SKIP_ATLAS !== "1") {
  const client = new MongoClient(mongoUri, {
    appName: process.env.MONGODB_APP_NAME || "haho-release-gate",
    maxPoolSize: 3,
    serverSelectionTimeoutMS: 10000
  });
  try {
    await client.connect();
    const db = client.db(mongoDb);
    const trainerEmails = Array.from({ length: 5 }, (_, index) => `trainer${index + 1}@haho.ai`);
    const athleteEmails = Array.from({ length: 5 }, (_, trainerIndex) =>
      Array.from({ length: 5 }, (_, athleteIndex) => `athlete${trainerIndex + 1}${athleteIndex + 1}@haho.ai`)
    ).flat();
    const users = await db.collection("users").countDocuments({ normalizedEmail: { $in: [...trainerEmails, ...athleteEmails] } });
    const entitledUsers = await db.collection("users").countDocuments({
      normalizedEmail: { $in: [...trainerEmails, ...athleteEmails] },
      "productEntitlements.habigoal.enabled": true,
      "productEntitlements.athleteIq.enabled": true
    });
    const trainers = await db.collection("users").countDocuments({ normalizedEmail: { $in: trainerEmails }, roles: "trainer" });
    const athletes = await db.collection("children").countDocuments({ email: { $in: athleteEmails }, generatedBy: GENERATED_BY });
    const teams = await db.collection("teams").countDocuments({ generatedBy: GENERATED_BY });
    const athleteIds = (await db.collection("children").find({ email: { $in: athleteEmails }, generatedBy: GENERATED_BY }, { projection: { _id: 1 } }).toArray()).map((doc) => doc._id.toString());
    const checkIns = await db.collection("athleteiq_checkins").countDocuments({ athleteId: { $in: athleteIds } });
    const habits = await db.collection("habit_records").countDocuments({ athleteId: { $in: athleteIds } });
    const trainingLoads = await db.collection("training_load_records").countDocuments({ athleteId: { $in: athleteIds }, generatedBy: GENERATED_BY });
    const dailyIq = await db.collection("athleteiq_daily_iq_snapshots").countDocuments({ athleteId: { $in: athleteIds }, generatedBy: GENERATED_BY });
    const dailyPlans = await db.collection("athleteiq_daily_plans").countDocuments({ athleteId: { $in: athleteIds }, generatedBy: GENERATED_BY });
    const painAlerts = await db.collection("athleteiq_pain_alerts").countDocuments({ athleteId: { $in: athleteIds }, generatedBy: GENERATED_BY });
    const coachActions = await db.collection("coach_actions").countDocuments({ athleteKey: { $in: athleteIds }, generatedBy: GENERATED_BY });
    atlas = { athletes, checkIns, coachActions, dailyIq, dailyPlans, entitledUsers, habits, painAlerts, teams, trainers, trainingLoads, users };
    if (users !== 30) failures.push(`Atlas users expected 30, found ${users}`);
    if (entitledUsers !== 30) failures.push(`Atlas both-product entitlements expected 30, found ${entitledUsers}`);
    if (trainers !== expected.trainers) failures.push(`Atlas trainers expected ${expected.trainers}, found ${trainers}`);
    if (athletes !== expected.athletes) failures.push(`Atlas athletes expected ${expected.athletes}, found ${athletes}`);
    if (teams !== expected.teams) failures.push(`Atlas teams expected ${expected.teams}, found ${teams}`);
    if (checkIns < expected.athletes * expected.days) failures.push(`Atlas check-ins below expected coverage: ${checkIns}`);
    if (habits < expected.athletes * expected.days) failures.push(`Atlas habit records below expected coverage: ${habits}`);
    if (trainingLoads < expected.athletes * expected.days) failures.push(`Atlas training load records below expected coverage: ${trainingLoads}`);
    if (dailyIq < expected.athletes * expected.days) failures.push(`Atlas Daily IQ snapshots below expected coverage: ${dailyIq}`);
    if (dailyPlans < expected.athletes * expected.days) failures.push(`Atlas daily plans below expected coverage: ${dailyPlans}`);
    if (painAlerts < 1) failures.push("Atlas pain-alert coverage expected at least 1 generated record");
    if (coachActions < expected.athletes) failures.push(`Atlas coach actions expected at least ${expected.athletes}, found ${coachActions}`);
  } finally {
    await client.close().catch(() => {});
  }
}

const report = {
  ok: failures.length === 0,
  atlas,
  checkedFiles: requiredFiles.length,
  generatedAt: new Date().toISOString(),
  releaseGate: "haho-ecosystem-release-gate-v1"
};

if (failures.length > 0) {
  console.error(JSON.stringify({ ...report, failures }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(report, null, 2));
