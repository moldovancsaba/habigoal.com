import { existsSync, readFileSync } from "node:fs";
import { MongoClient, ObjectId } from "mongodb";

const GENERATED_BY = "haho-ecosystem-live-data-v1";
const ORGANISATION_ID = "haho-performance-ecosystem";
const TIMEZONE = "Europe/Budapest";
const DAYS = Number(process.env.HAHO_SEED_DAYS || 90);
const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const resetSeededRecords = args.has("--reset");
const rollback = args.has("--rollback");

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

loadEnvFile(".env");
loadEnvFile(".env.local");

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "habigoal";

const trainerProfiles = Array.from({ length: 5 }, (_, index) => {
  const number = index + 1;
  return {
    displayName: `Haho Trainer ${number}`,
    email: `trainer${number}@haho.ai`,
    teamSlug: `haho-team-${number}`,
    teamName: `Haho Team ${number}`
  };
});

const athleteProfiles = trainerProfiles.flatMap((trainer, trainerIndex) =>
  Array.from({ length: 5 }, (_, athleteIndex) => {
    const trainerNumber = trainerIndex + 1;
    const athleteNumber = athleteIndex + 1;
    return {
      displayName: `Haho Athlete ${trainerNumber}${athleteNumber}`,
      email: `athlete${trainerNumber}${athleteNumber}@haho.ai`,
      key: `haho-athlete-${trainerNumber}${athleteNumber}`,
      position: ["Forward", "Midfielder", "Defender", "Goalkeeper", "Utility"][athleteIndex],
      trainerEmail: trainer.email,
      teamSlug: trainer.teamSlug,
      birthDate: `${2007 + athleteIndex}-${String(2 + trainerIndex).padStart(2, "0")}-${String(10 + athleteIndex).padStart(2, "0")}`,
      baselineSeed: trainerIndex * 5 + athleteIndex
    };
  })
);

const habitKeys = ["extraTouches", "weakFoot", "tacticalLearning", "stretching", "mobility", "recoverySession", "hydration", "nutrition", "sleepBeforeMidnight"];

function localDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: TIMEZONE,
    year: "numeric"
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function shiftDate(date, days) {
  const shifted = new Date(`${date}T00:00:00.000Z`);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return shifted.toISOString().slice(0, 10);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function tenPointToScore(value) {
  return Math.round(((value - 1) / 9) * 1000) / 10;
}

function checkInValue(rawValue, normalizedValue, sourceLabel = "user_input") {
  return { rawValue, normalizedValue, sourceLabel };
}

function average(values) {
  const available = values.filter((value) => typeof value === "number" && Number.isFinite(value));
  if (!available.length) return null;
  return Math.round((available.reduce((sum, value) => sum + value, 0) / available.length) * 10) / 10;
}

function invertScore(score) {
  return score === null ? null : Math.round((100 - score) * 10) / 10;
}

function buildCheckIn(athleteIndex, dayIndex) {
  const rhythm = (athleteIndex * 7 + dayIndex * 3) % 11;
  const trainingDay = dayIndex % 7 !== 1 && dayIndex % 7 !== 5;
  const highLoad = trainingDay && rhythm % 5 === 0;
  const sleepQuality = clamp(8 - (rhythm % 4) + (trainingDay ? 0 : 1), 3, 10);
  const fatigue = clamp(3 + (rhythm % 5) + (highLoad ? 1 : 0), 1, 10);
  const pain = clamp(1 + (rhythm === 0 ? 7 : rhythm === 1 ? 4 : rhythm === 2 ? 1 : 0), 1, 10);
  const stress = clamp(3 + ((athleteIndex + dayIndex) % 5), 1, 10);
  const mood = clamp(8 - (stress >= 7 ? 2 : 0) - (pain >= 6 ? 1 : 0), 1, 10);
  const motivation = clamp(7 + ((athleteIndex + dayIndex) % 3) - (pain >= 7 ? 2 : 0), 1, 10);
  const confidence = clamp(7 + ((athleteIndex + dayIndex + 2) % 3) - (stress >= 7 ? 1 : 0), 1, 10);
  const focus = clamp(7 + ((athleteIndex + dayIndex + 4) % 3) - (fatigue >= 7 ? 1 : 0), 1, 10);
  const duration = trainingDay ? clamp(45 + ((athleteIndex + dayIndex) % 6) * 8, 35, 90) : 20;
  const rpe = trainingDay ? clamp(4 + ((athleteIndex + dayIndex * 2) % 6), 3, 9) : 2;
  const trainingLoad = duration * rpe;
  const sleepHours = Math.round((6.8 + sleepQuality * 0.18 - (stress >= 7 ? 0.5 : 0)) * 10) / 10;
  const manualHrv = clamp(48 + sleepQuality * 3 - fatigue * 2 + (athleteIndex % 8), 28, 98);
  const manualRestingHr = clamp(62 + fatigue + stress - Math.round(manualHrv / 18), 42, 86);
  return {
    duration,
    pain,
    raw: {
      sleepQuality,
      fatigue,
      pain,
      stress,
      mood,
      motivation,
      confidence,
      focus,
      trainingLoad,
      sleepHours,
      manualHrv,
      manualRestingHr,
      sorenessAreas: pain >= 7 ? ["hamstring", "ankle"] : pain >= 5 ? ["quad"] : [],
      deviceSourceStatus: "manual",
      note: trainingDay ? "Daily Athlete IQ entry saved from live ecosystem data." : "Recovery day entry saved from live ecosystem data."
    },
    rpe,
    trainingDay,
    trainingLoad
  };
}

function buildStatuses(athleteIndex, dayIndex) {
  return Object.fromEntries(habitKeys.map((key, habitIndex) => [
    key,
    ((athleteIndex + dayIndex + habitIndex) % 6) !== 0
  ]));
}

function habitScore(statuses) {
  const done = Object.values(statuses).filter(Boolean).length;
  return Math.round((done / habitKeys.length) * 1000) / 10;
}

function safeLoadScore(loadPoints) {
  if (loadPoints < 120) return 55;
  if (loadPoints <= 520) return 90;
  if (loadPoints <= 760) return 74;
  return 48;
}

function weightedDailyIq({ habit, mental, pain, readiness, safeLoad }) {
  const raw = readiness * 0.4 + mental * 0.3 + habit * 0.2 + safeLoad * 0.1;
  const cap = pain >= 7 ? 60 : pain >= 5 ? 75 : null;
  return Math.round((cap === null ? raw : Math.min(raw, cap)) * 10) / 10;
}

function buildDailyPlan({ athleteId, date, dailyIq, pain, statuses }) {
  const now = new Date().toISOString();
  const openHabit = habitKeys.find((key) => !statuses[key]);
  const tasks = [];
  if (pain >= 7) tasks.push(task("safety:pain-guardrail", "safety", "athleteiq.dailyPlan.tasks.painGuardrail.title", "athleteiq.dailyPlan.tasks.painGuardrail.description", "critical", ["high_pain"], "training"));
  if (dailyIq < 70) tasks.push(task("readiness:review", "setup", "athleteiq.dailyPlan.tasks.completeCheckIn.title", "athleteiq.dailyPlan.tasks.completeCheckIn.description", "high", ["low_daily_iq"], "morning"));
  if (openHabit) tasks.push(task(`habit:${openHabit}`, "habit", `athleteiq.dailyPlan.habits.${openHabit}.title`, "athleteiq.dailyPlan.tasks.habit.description", dailyIq < 65 ? "medium" : "low", ["habit_gap"], "anytime"));
  return {
    athleteId,
    localDate: date,
    timezone: TIMEZONE,
    status: "active",
    tasks,
    recommendation: {
      intensity: pain >= 7 ? "recovery" : dailyIq >= 80 ? "high" : dailyIq >= 65 ? "moderate" : "low",
      type: pain >= 7 ? "recovery" : dailyIq >= 80 ? "high_intensity" : dailyIq >= 65 ? "controlled" : "recovery",
      durationRange: pain >= 7 ? "15-30" : dailyIq >= 80 ? "45-75" : dailyIq >= 65 ? "35-60" : "20-40",
      rationale: pain >= 7 ? ["high_pain"] : dailyIq >= 80 ? ["high_daily_iq"] : ["daily_state"],
      blockedByPainGuardrail: pain >= 7
    },
    dataUsed: ["daily_iq", "habit_records", "training_load"],
    missingData: [],
    generatedAt: now,
    updatedAt: now,
    version: "haho-ecosystem-plan-1",
    auditHistory: [`seeded:${GENERATED_BY}:${now}`],
    generatedBy: GENERATED_BY,
    source: GENERATED_BY
  };
}

function task(id, category, titleKey, descriptionKey, priority, sourceReasonCodes, dueWindow) {
  return { id, category, titleKey, descriptionKey, priority, sourceReasonCodes, dueWindow, completionState: "open" };
}

async function ensureIndexes(db) {
  await Promise.all([
    db.collection("users").createIndex({ normalizedEmail: 1 }, { unique: true, sparse: true }),
    db.collection("teams").createIndex({ slug: 1 }, { unique: true, sparse: true }),
    db.collection("children").createIndex({ email: 1 }, { sparse: true }),
    db.collection("athleteiq_checkins").createIndex({ athleteId: 1, localDate: 1, mode: 1 }, { unique: true }),
    db.collection("habit_records").createIndex({ athleteId: 1, date: 1 }, { unique: true }),
    db.collection("training_load_records").createIndex({ athleteId: 1, date: 1, source: 1, generatedBy: 1 }, { unique: true }),
    db.collection("athleteiq_daily_iq_snapshots").createIndex({ athleteId: 1, localDate: 1, mode: 1 }, { unique: true }),
    db.collection("athleteiq_daily_plans").createIndex({ athleteId: 1, localDate: 1 }, { unique: true }),
    db.collection("haho_seed_manifests").createIndex({ seedVersion: 1, generatedBy: 1 })
  ]);
}

async function deleteSeededRecords(db) {
  const seededUserEmails = [...trainerProfiles.map((trainer) => trainer.email), ...athleteProfiles.map((athlete) => athlete.email)];
  const seededAthleteIds = (await db.collection("children").find({ generatedBy: GENERATED_BY }, { projection: { _id: 1 } }).toArray()).map((doc) => doc._id.toString());
  const generatedFilter = { generatedBy: GENERATED_BY };
  const athleteFilter = seededAthleteIds.length ? { athleteId: { $in: seededAthleteIds } } : generatedFilter;
  const results = {};
  results.users = (await db.collection("users").deleteMany({ email: { $in: seededUserEmails }, generatedBy: GENERATED_BY })).deletedCount;
  results.teams = (await db.collection("teams").deleteMany(generatedFilter)).deletedCount;
  results.children = (await db.collection("children").deleteMany(generatedFilter)).deletedCount;
  results.checkIns = (await db.collection("athleteiq_checkins").deleteMany({ $or: [generatedFilter, athleteFilter] })).deletedCount;
  results.habits = (await db.collection("habit_records").deleteMany({ $or: [generatedFilter, athleteFilter] })).deletedCount;
  results.trainingLoads = (await db.collection("training_load_records").deleteMany({ $or: [generatedFilter, athleteFilter] })).deletedCount;
  results.dailyIq = (await db.collection("athleteiq_daily_iq_snapshots").deleteMany({ $or: [generatedFilter, athleteFilter] })).deletedCount;
  results.dailyPlans = (await db.collection("athleteiq_daily_plans").deleteMany({ $or: [generatedFilter, athleteFilter] })).deletedCount;
  results.painAlerts = (await db.collection("athleteiq_pain_alerts").deleteMany({ $or: [generatedFilter, athleteFilter] })).deletedCount;
  results.coachActions = (await db.collection("coach_actions").deleteMany({ $or: [generatedFilter, { athleteKey: { $in: seededAthleteIds } }] })).deletedCount;
  results.manifests = (await db.collection("haho_seed_manifests").deleteMany(generatedFilter)).deletedCount;
  return results;
}

async function upsertOne(collection, filter, document) {
  if (dryRun) return { ...document, _id: new ObjectId() };
  await collection.updateOne(filter, buildUpsertUpdate(document), { upsert: true });
  return collection.findOne(filter);
}

function buildUpsertUpdate(document) {
  const now = new Date().toISOString();
  const { createdAt, ...setDocument } = document;
  return {
    $set: { ...setDocument, updatedAt: document.updatedAt || now },
    $setOnInsert: { createdAt: createdAt || now }
  };
}

function upsertOperation(filter, document) {
  return {
    updateOne: {
      filter,
      update: buildUpsertUpdate(document),
      upsert: true
    }
  };
}

async function flushBulk(collection, operations) {
  if (dryRun || operations.length === 0) return null;
  return collection.bulkWrite(operations, { ordered: false });
}

// Core seed routine. Accepts an existing Mongo `db` so it can run both from the
// CLI and from the in-app ops endpoint (which uses the app's connection). Returns
// the manifest instead of printing/exiting, so it is import-safe.
export async function runHahoSeed(db, options = {}) {
  const days = options.days ?? DAYS;
  await ensureIndexes(db);

  if (rollback || resetSeededRecords) {
    if (dryRun) {
      if (rollback) return { ok: true, dryRun, rollback, wouldDeleteSource: GENERATED_BY };
    } else {
      const deleted = await deleteSeededRecords(db);
      if (rollback) {
        return { ok: true, rollback: true, generatedBy: GENERATED_BY, deleted };
      }
    }
  }

  const today = localDate();
  const dates = Array.from({ length: days }, (_, index) => shiftDate(today, index - (days - 1)));
  const now = new Date().toISOString();
  const users = db.collection("users");
  const children = db.collection("children");
  const teams = db.collection("teams");
  const checkIns = db.collection("athleteiq_checkins");
  const habitRecords = db.collection("habit_records");
  const trainingLoads = db.collection("training_load_records");
  const dailyIqSnapshots = db.collection("athleteiq_daily_iq_snapshots");
  const dailyPlans = db.collection("athleteiq_daily_plans");
  const painAlerts = db.collection("athleteiq_pain_alerts");
  const coachActions = db.collection("coach_actions");

  const trainerDocs = new Map();
  for (const trainer of trainerProfiles) {
    const doc = await upsertOne(users, { normalizedEmail: trainer.email }, {
      email: trainer.email,
      normalizedEmail: trainer.email,
      name: trainer.displayName,
      roles: ["trainer", "athlete"],
      productEntitlements: {
        habigoal: { enabled: true, grantedAt: now, reason: "aiq_member" },
        athleteIq: { enabled: true, grantedAt: now, reason: "trainer_assignment" }
      },
      teamIds: [],
      generatedBy: GENERATED_BY,
      seedVersion: GENERATED_BY,
      lastLoginAt: now
    });
    trainerDocs.set(trainer.email, doc);
  }

  const athleteDocs = new Map();
  for (const [index, athlete] of athleteProfiles.entries()) {
    const child = await upsertOne(children, { email: athlete.email }, {
      surveyId: athlete.key,
      userId: undefined,
      email: athlete.email,
      name: athlete.displayName,
      birthDate: athlete.birthDate,
      organisationId: ORGANISATION_ID,
      position: athlete.position,
      status: "active",
      profileState: "active",
      createdFrom: "manual",
      parentGuardianEmail: `guardian${index + 1}@haho.ai`,
      baselineProfile: {
        heightCm: 165 + (index % 12),
        weightKg: 55 + (index % 18),
        restingHeartRate: 50 + (index % 14),
        sleepTargetHours: 8,
        cognitiveScore: 65 + (index % 25),
        confidenceBaseline: 68 + (index % 20),
        focusBaseline: 66 + (index % 22),
        motivationBaseline: 70 + (index % 18),
        stressBaseline: 30 + (index % 30),
        weeklyGoal: `${athlete.position} consistency and readiness`,
        preferredTrainingDays: ["Monday", "Wednesday", "Friday"],
        supportPreferences: ["short coach cue", "progress chart", "recovery reminder"],
        onboardingCompletedAt: now,
        coachBaselineNotes: "Haho ecosystem athlete profile enriched for live product walkthroughs."
      },
      consentPhoto: true,
      consentReport: true,
      dominantFoot: index % 4 === 0 ? "left" : "right",
      knownTraits: "Live profile with realistic readiness, training, habit, and support history.",
      locale: "en",
      customAttributes: {
        clubId: ORGANISATION_ID,
        coachEmail: athlete.trainerEmail,
        seedCohort: GENERATED_BY
      },
      generatedBy: GENERATED_BY,
      seedVersion: GENERATED_BY
    });
    const athleteId = child._id.toString();
    athleteDocs.set(athlete.email, { ...athlete, id: athleteId });
    await upsertOne(users, { normalizedEmail: athlete.email }, {
      email: athlete.email,
      normalizedEmail: athlete.email,
      name: athlete.displayName,
      roles: ["athlete"],
      athleteId,
      productEntitlements: {
        habigoal: { enabled: true, grantedAt: now, reason: "aiq_member" },
        athleteIq: { enabled: true, grantedAt: now, reason: "pro_athlete_membership" }
      },
      teamIds: [],
      generatedBy: GENERATED_BY,
      seedVersion: GENERATED_BY,
      lastLoginAt: now
    });
  }

  const teamDocs = new Map();
  for (const trainer of trainerProfiles) {
    const athleteIds = athleteProfiles.filter((athlete) => athlete.trainerEmail === trainer.email).map((athlete) => athleteDocs.get(athlete.email).id);
    const team = await upsertOne(teams, { slug: trainer.teamSlug }, {
      slug: trainer.teamSlug,
      name: trainer.teamName,
      trainerEmails: [trainer.email],
      athleteIds,
      organisationId: ORGANISATION_ID,
      generatedBy: GENERATED_BY,
      seedVersion: GENERATED_BY
    });
    const teamId = team._id.toString();
    teamDocs.set(trainer.teamSlug, { ...trainer, id: teamId, athleteIds });
    if (!dryRun) {
      await users.updateOne({ normalizedEmail: trainer.email }, { $set: { teamIds: [teamId], updatedAt: now } });
      await children.updateMany({ _id: { $in: athleteIds.map((id) => new ObjectId(id)) } }, { $set: { teamId, updatedAt: now } });
      await users.updateMany({ athleteId: { $in: athleteIds } }, { $set: { teamIds: [teamId], updatedAt: now } });
    }
  }

  let checkInCount = 0;
  let habitCount = 0;
  let trainingLoadCount = 0;
  let dailyIqCount = 0;
  let dailyPlanCount = 0;
  let painAlertCount = 0;
  let coachActionCount = 0;
  const checkInOps = [];
  const habitRecordOps = [];
  const trainingLoadOps = [];
  const dailyIqOps = [];
  const dailyPlanOps = [];
  const painAlertOps = [];
  const coachActionOps = [];

  for (const [athleteIndex, athlete] of athleteProfiles.entries()) {
    const athleteDoc = athleteDocs.get(athlete.email);
    const team = teamDocs.get(athlete.teamSlug);
    for (const [dayIndex, date] of dates.entries()) {
      const checkIn = buildCheckIn(athleteIndex, dayIndex);
      const statuses = buildStatuses(athleteIndex, dayIndex);
      const baseValues = {
        sleepQuality: checkInValue(checkIn.raw.sleepQuality, tenPointToScore(checkIn.raw.sleepQuality)),
        fatigue: checkInValue(checkIn.raw.fatigue, tenPointToScore(checkIn.raw.fatigue)),
        pain: checkInValue(checkIn.raw.pain, tenPointToScore(checkIn.raw.pain)),
        stress: checkInValue(checkIn.raw.stress, tenPointToScore(checkIn.raw.stress)),
        mood: checkInValue(checkIn.raw.mood, tenPointToScore(checkIn.raw.mood)),
        motivation: checkInValue(checkIn.raw.motivation, tenPointToScore(checkIn.raw.motivation)),
        confidence: checkInValue(checkIn.raw.confidence, tenPointToScore(checkIn.raw.confidence)),
        focus: checkInValue(checkIn.raw.focus, tenPointToScore(checkIn.raw.focus)),
        trainingLoad: checkInValue(checkIn.raw.trainingLoad, null, "manual_entry"),
        sorenessAreas: checkInValue(checkIn.raw.sorenessAreas, null, "manual_entry"),
        sleepHours: checkInValue(checkIn.raw.sleepHours, null, "manual_entry"),
        manualHrv: checkInValue(checkIn.raw.manualHrv, null, "manual_entry"),
        manualRestingHr: checkInValue(checkIn.raw.manualRestingHr, null, "manual_entry"),
        deviceSourceStatus: checkInValue(checkIn.raw.deviceSourceStatus, null, "manual_entry"),
        note: checkInValue(checkIn.raw.note, null)
      };
      const sourceLabels = Object.fromEntries(Object.entries(baseValues).map(([key, value]) => [key, value.sourceLabel]));
      const submittedAt = `${date}T07:${String(10 + athleteIndex).padStart(2, "0")}:00.000Z`;

      for (const mode of ["lifestyle", "performance"]) {
        checkInOps.push(upsertOperation({ athleteId: athleteDoc.id, localDate: date, mode }, {
          athleteId: athleteDoc.id,
          mode,
          localDate: date,
          timezone: TIMEZONE,
          values: mode === "lifestyle"
            ? Object.fromEntries(["sleepQuality", "fatigue", "pain", "stress", "mood"].map((key) => [key, baseValues[key]]))
            : baseValues,
          missingFields: [],
          sourceLabels,
          submittedAt,
          updatedAt: now,
          idempotencyKey: `${GENERATED_BY}:${athlete.key}:${date}:${mode}`,
          auditHistory: [`seeded:${GENERATED_BY}:${now}`],
          generatedBy: GENERATED_BY,
          seedVersion: GENERATED_BY
        }));
        checkInCount += 1;
      }

      habitRecordOps.push(upsertOperation({ athleteId: athleteDoc.id, date }, {
        athleteId: athleteDoc.id,
        date,
        statuses,
        generatedBy: GENERATED_BY,
        seedVersion: GENERATED_BY
      }));
      habitCount += 1;

      trainingLoadOps.push(upsertOperation({ athleteId: athleteDoc.id, date, source: "trainer", generatedBy: GENERATED_BY }, {
        athleteId: athleteDoc.id,
        date,
        source: "trainer",
        activityTypes: checkIn.trainingDay ? ["technical", "conditioning"] : ["recovery", "mobility"],
        durationMinutes: checkIn.duration,
        rpe: checkIn.rpe,
        loadPoints: checkIn.trainingLoad,
        note: `${team.teamName} training load.`,
        createdBy: athlete.trainerEmail,
        generatedBy: GENERATED_BY,
        seedVersion: GENERATED_BY
      }));
      trainingLoadCount += 1;

      const readiness = average([
        tenPointToScore(checkIn.raw.sleepQuality),
        invertScore(tenPointToScore(checkIn.raw.fatigue)),
        invertScore(tenPointToScore(checkIn.raw.stress)),
        tenPointToScore(checkIn.raw.mood)
      ]);
      const mental = average([
        tenPointToScore(checkIn.raw.mood),
        invertScore(tenPointToScore(checkIn.raw.stress)),
        tenPointToScore(checkIn.raw.confidence),
        tenPointToScore(checkIn.raw.focus),
        tenPointToScore(checkIn.raw.motivation)
      ]);
      const habits = habitScore(statuses);
      const safeLoad = safeLoadScore(checkIn.trainingLoad);
      const dailyIq = weightedDailyIq({ habit: habits, mental, pain: checkIn.pain, readiness, safeLoad });
      const painRiskLevel = checkIn.pain >= 7 ? "high" : checkIn.pain >= 5 ? "moderate" : checkIn.pain > 1 ? "low" : "none";

      dailyIqOps.push(upsertOperation({ athleteId: athleteDoc.id, localDate: date, mode: "performance" }, {
        calculationId: `${GENERATED_BY}:${athlete.key}:${date}`,
        athleteId: athleteDoc.id,
        localDate: date,
        timezone: TIMEZONE,
        mode: "performance",
        dailyIqScore: dailyIq,
        readinessScore: readiness,
        mentalEdgeScore: mental,
        habitScore: habits,
        safeLoadScore: safeLoad,
        recoverySupportScore: null,
        painRiskLevel,
        confidence: "high",
        dataUsed: ["checkIn", "habits", "sessionLoad", "moduleRegistry"],
        missingData: [],
        explanation: [painRiskLevel === "high" ? "Pain risk caps high-intensity work." : "Daily IQ uses check-in, habit, and load records."],
        algorithmVersion: "haho-ecosystem-daily-iq-1",
        moduleRegistryVersion: "athleteiq-module-registry-2026-06",
        componentWeights: { wellnessReadiness: 0.4, mentalEdge: 0.3, habitConsistency: 0.2, loadFit: 0.1, recoverySupport: 0 },
        painCapApplied: painRiskLevel === "high" ? 60 : painRiskLevel === "moderate" ? 75 : null,
        highIntensityBlocked: painRiskLevel === "high",
        createdAt: now,
        generatedBy: GENERATED_BY,
        seedVersion: GENERATED_BY
      }));
      dailyIqCount += 1;

      dailyPlanOps.push(upsertOperation({ athleteId: athleteDoc.id, localDate: date }, buildDailyPlan({
        athleteId: athleteDoc.id,
        date,
        dailyIq,
        pain: checkIn.pain,
        statuses
      })));
      dailyPlanCount += 1;

      if (checkIn.pain >= 7) {
        painAlertOps.push(upsertOperation({ athleteId: athleteDoc.id, localDate: date }, {
          athleteId: athleteDoc.id,
          localDate: date,
          state: date === today ? "coach_review" : "monitor",
          riskLevel: "high",
          painScore: checkIn.pain,
          locations: checkIn.raw.sorenessAreas,
          reasonCodes: ["pain_threshold", "load_context"],
          requiredCopyKey: "athleteiq.painSafety.coachReview",
          auditHistory: [`seeded:${GENERATED_BY}:${now}`],
          generatedBy: GENERATED_BY,
          seedVersion: GENERATED_BY
        }));
        painAlertCount += 1;
      }
    }

    const todayState = buildCheckIn(athleteIndex, dates.length - 1);
    const recommendationKey = todayState.pain >= 7 ? "pain-guardrail-review" : todayState.raw.stress >= 7 ? "readiness-conversation" : "session-progression";
    coachActionOps.push(upsertOperation({ athleteKey: athleteDoc.id, date: today, recommendationKey }, {
      athleteKey: athleteDoc.id,
      date: today,
      recommendationKey,
      status: todayState.pain >= 7 ? "open" : "acknowledged",
      severity: todayState.pain >= 7 ? "critical" : "warning",
      sourceType: todayState.pain >= 7 ? "readiness-threshold" : "recommendation",
      sourceId: `${GENERATED_BY}:${athlete.key}:${today}`,
      detail: todayState.pain >= 7 ? "Pain threshold requires coach review before high intensity work." : "Review readiness and confirm session progression.",
      actorName: trainerProfiles.find((trainer) => trainer.email === athlete.trainerEmail)?.displayName ?? athlete.trainerEmail,
      actorEmail: athlete.trainerEmail,
      generatedBy: GENERATED_BY,
      seedVersion: GENERATED_BY
    }));
    coachActionCount += 1;
  }

  await Promise.all([
    flushBulk(checkIns, checkInOps),
    flushBulk(habitRecords, habitRecordOps),
    flushBulk(trainingLoads, trainingLoadOps),
    flushBulk(dailyIqSnapshots, dailyIqOps),
    flushBulk(dailyPlans, dailyPlanOps),
    flushBulk(painAlerts, painAlertOps),
    flushBulk(coachActions, coachActionOps)
  ]);

  const manifest = {
    ok: true,
    dryRun,
    database: dbName,
    generatedBy: GENERATED_BY,
    seedVersion: GENERATED_BY,
    trainers: trainerProfiles.length,
    athletes: athleteProfiles.length,
    users: trainerProfiles.length + athleteProfiles.length,
    teams: trainerProfiles.length,
    checkIns: checkInCount,
    habitRecords: habitCount,
    trainingLoads: trainingLoadCount,
    dailyIqSnapshots: dailyIqCount,
    dailyPlans: dailyPlanCount,
    painAlerts: painAlertCount,
    coachActions: coachActionCount,
    dateRange: { from: dates[0], to: today },
    correctedAliases: ["athlete25@haho.au -> athlete25@haho.ai"],
    validation: {
      expectedTrainerCount: 5,
      expectedAthleteCount: 25,
      expectedTeamCount: 5,
      expectedDays: days
    },
    generatedAt: now
  };

  if (!dryRun) {
    await db.collection("haho_seed_manifests").insertOne(manifest);
  }

  return manifest;
}

// CLI entrypoint: runs only when this file is executed directly, not on import.
const invokedDirectly =
  process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("scripts/seed-haho-ecosystem.mjs");
if (invokedDirectly) {
  if (!uri) {
    console.error("MONGODB_URI is missing. Add the Atlas connection string before running this script.");
    process.exit(1);
  }
  const client = new MongoClient(uri, {
    appName: process.env.MONGODB_APP_NAME || "haho-ecosystem-seed",
    maxPoolSize: 5,
    serverSelectionTimeoutMS: 10000
  });
  try {
    await client.connect();
    const manifest = await runHahoSeed(client.db(dbName));
    console.log(JSON.stringify(manifest, null, 2));
  } catch (error) {
    console.error(error);
    process.exit(1);
  } finally {
    await client.close().catch(() => {});
  }
}
