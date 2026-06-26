import { existsSync, readFileSync } from "node:fs";
import { MongoClient, ObjectId } from "mongodb";

const GENERATED_BY = "athleteiq-live-product-data-v1";
const ORGANISATION_ID = "habigoal-athleteiq-club";
const TIMEZONE = "Europe/Budapest";
const DAYS = 10;

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
loadEnvFile(".env.example");

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "habigoal";

if (!uri) {
  console.error("MONGODB_URI is missing. Add the Atlas connection string before running this script.");
  process.exit(1);
}

const trainerProfiles = [
  { name: "Eva Kovacs", email: "eva.kovacs@habigoal.app", roles: ["trainer"] },
  { name: "Mark Nagy", email: "mark.nagy@habigoal.app", roles: ["trainer", "performance_coach"] },
  { name: "Sofia Toth", email: "sofia.toth@habigoal.app", roles: ["trainer", "physio"] },
  { name: "Daniel Varga", email: "daniel.varga@habigoal.app", roles: ["trainer", "club_management"] }
];

const athleteProfiles = [
  { key: "aiq-athlete-01", name: "Lena Farkas", birthDate: "2010-03-14", position: "Forward", dominantFoot: "right", teamSlug: "u16-performance", status: "active", baseline: [168, 56, 62, 8.4], traits: "Explosive first step, responds well to concise tactical cues.", injuryFlags: [] },
  { key: "aiq-athlete-02", name: "Mate Balogh", birthDate: "2009-11-02", position: "Central midfielder", dominantFoot: "right", teamSlug: "u16-performance", status: "active", baseline: [174, 61, 58, 8.1], traits: "Strong game reading, fatigue rises after congested match weeks.", injuryFlags: ["hamstring-watch"] },
  { key: "aiq-athlete-03", name: "Anna Kiss", birthDate: "2011-05-22", position: "Wing back", dominantFoot: "left", teamSlug: "u16-performance", status: "active", baseline: [164, 52, 60, 8.6], traits: "Consistent recovery habits, benefits from progressive overload.", injuryFlags: [] },
  { key: "aiq-athlete-04", name: "Noah Horvath", birthDate: "2010-08-19", position: "Goalkeeper", dominantFoot: "right", teamSlug: "academy-sprint", status: "active", baseline: [181, 68, 54, 7.8], traits: "High focus in reaction drills, sleep timing needs monitoring.", injuryFlags: [] },
  { key: "aiq-athlete-05", name: "Zara Molnar", birthDate: "2012-01-09", position: "Attacking midfielder", dominantFoot: "right", teamSlug: "academy-sprint", status: "active", baseline: [158, 48, 66, 8.9], traits: "Creative decision maker, thrives with visible progress goals.", injuryFlags: [] },
  { key: "aiq-athlete-06", name: "Bence Szabo", birthDate: "2009-06-27", position: "Centre back", dominantFoot: "right", teamSlug: "academy-sprint", status: "injured", baseline: [179, 70, 57, 7.6], traits: "Return-to-play athlete with strong adherence to physio tasks.", injuryFlags: ["ankle-return-to-play"] },
  { key: "aiq-athlete-07", name: "Mira Varga", birthDate: "2011-09-11", position: "Defensive midfielder", dominantFoot: "right", teamSlug: "return-to-play", status: "active", baseline: [166, 55, 59, 8.2], traits: "Reliable communicator, confidence fluctuates after high-pressure matches.", injuryFlags: ["knee-load-watch"] },
  { key: "aiq-athlete-08", name: "Levente Toth", birthDate: "2010-12-03", position: "Winger", dominantFoot: "left", teamSlug: "return-to-play", status: "active", baseline: [170, 58, 61, 8.5], traits: "High-speed runner, needs load guardrails during sprint blocks.", injuryFlags: [] },
  { key: "aiq-athlete-09", name: "Emilia Nagy", birthDate: "2012-04-18", position: "Striker", dominantFoot: "right", teamSlug: "return-to-play", status: "active", baseline: [160, 50, 64, 8.7], traits: "Strong motivation, best with short recovery reflections.", injuryFlags: [] },
  { key: "aiq-athlete-10", name: "Adam Pinter", birthDate: "2009-02-07", position: "Full back", dominantFoot: "right", teamSlug: "development-squad", status: "active", baseline: [176, 63, 56, 7.9], traits: "Durable trainer, workload must be balanced around school stress.", injuryFlags: [] },
  { key: "aiq-athlete-11", name: "Janka Simon", birthDate: "2011-07-30", position: "Box-to-box midfielder", dominantFoot: "right", teamSlug: "development-squad", status: "active", baseline: [163, 51, 63, 8.3], traits: "Good habit streaks, needs confidence cue before contact drills.", injuryFlags: [] },
  { key: "aiq-athlete-12", name: "Oliver Lakatos", birthDate: "2010-10-25", position: "Forward", dominantFoot: "left", teamSlug: "development-squad", status: "active", baseline: [172, 60, 55, 8.0], traits: "Power athlete, benefits from soreness checks after acceleration work.", injuryFlags: ["quad-soreness-watch"] }
];

const teamProfiles = [
  { slug: "u16-performance", name: "U16 Performance", trainerEmails: ["eva.kovacs@habigoal.app", "mark.nagy@habigoal.app"] },
  { slug: "academy-sprint", name: "Academy Sprint", trainerEmails: ["mark.nagy@habigoal.app"] },
  { slug: "return-to-play", name: "Return to Play", trainerEmails: ["sofia.toth@habigoal.app", "eva.kovacs@habigoal.app"] },
  { slug: "development-squad", name: "Development Squad", trainerEmails: ["daniel.varga@habigoal.app", "eva.kovacs@habigoal.app"] }
];

const habitKeys = ["extraTouches", "weakFoot", "tacticalLearning", "stretching", "mobility", "recoverySession", "hydration", "nutrition", "sleepBeforeMidnight"];
const scoreKeys = [
  ["movement_quality", "movement"],
  ["coordination", "movement"],
  ["balance", "movement"],
  ["teamwork", "social"],
  ["communication", "social"],
  ["coachability", "social"],
  ["confidence", "mental"],
  ["focus", "mental"],
  ["resilience", "mental"],
  ["sleep_quality", "mental"],
  ["body_feel", "movement"],
  ["fuel_hydration", "mental"],
  ["energy_level", "mental"]
];

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

function invertScore(score) {
  return score === null ? null : Math.round((100 - score) * 10) / 10;
}

function average(values) {
  const available = values.filter((value) => typeof value === "number" && Number.isFinite(value));
  if (!available.length) return null;
  return Math.round((available.reduce((sum, value) => sum + value, 0) / available.length) * 10) / 10;
}

function habitScore(statuses) {
  const done = Object.values(statuses).filter(Boolean).length;
  return Math.round((done / habitKeys.length) * 1000) / 10;
}

function safeLoadScore(loadPoints) {
  if (loadPoints <= 0) return 40;
  if (loadPoints < 180) return 55;
  if (loadPoints <= 520) return 90;
  if (loadPoints <= 760) return 75;
  return 50;
}

function weightedDailyIq({ readiness, mental, habit, safeLoad, pain }) {
  const scores = [
    [readiness, 0.4],
    [mental, 0.3],
    [habit, 0.2],
    [safeLoad, 0.1]
  ].filter(([score]) => typeof score === "number");
  const weight = scores.reduce((sum, [, itemWeight]) => sum + itemWeight, 0);
  const raw = scores.reduce((sum, [score, itemWeight]) => sum + score * itemWeight, 0) / weight;
  const cap = pain >= 7 ? 60 : pain >= 5 ? 75 : null;
  return Math.round((cap === null ? raw : Math.min(raw, cap)) * 10) / 10;
}

function buildStatuses(athleteIndex, dayIndex) {
  return Object.fromEntries(habitKeys.map((key, habitIndex) => [
    key,
    ((athleteIndex + dayIndex + habitIndex) % 5) !== 0
  ]));
}

function buildCheckInValues(athleteIndex, dayIndex, profile) {
  const rhythm = (athleteIndex * 3 + dayIndex * 2) % 7;
  const injured = profile.status === "injured";
  const sleepQuality = clamp(8 - (rhythm % 3), 4, 10);
  const fatigue = clamp(3 + (rhythm % 4) + (injured ? 1 : 0), 1, 10);
  const pain = clamp((injured ? 6 : 1) + (rhythm === 0 ? 2 : rhythm === 1 ? 1 : 0), 1, 10);
  const stress = clamp(3 + ((athleteIndex + dayIndex) % 4), 1, 10);
  const mood = clamp(8 - (stress >= 6 ? 2 : 0) - (pain >= 7 ? 1 : 0), 1, 10);
  const motivation = clamp(7 + ((athleteIndex + dayIndex) % 3) - (pain >= 7 ? 2 : 0), 1, 10);
  const confidence = clamp(7 + ((athleteIndex + dayIndex + 1) % 3) - (stress >= 6 ? 1 : 0), 1, 10);
  const focus = clamp(7 + ((athleteIndex + dayIndex + 2) % 3) - (fatigue >= 6 ? 1 : 0), 1, 10);
  const duration = clamp(45 + ((athleteIndex + dayIndex) % 5) * 8, 25, 85);
  const rpe = clamp(4 + ((athleteIndex + dayIndex * 2) % 5), 1, 10);
  const trainingLoad = duration * rpe;
  const sleepHours = Math.round((7.2 + (sleepQuality - 7) * 0.25 - (stress >= 6 ? 0.4 : 0)) * 10) / 10;
  const hrv = clamp(profile.baseline[2] + (sleepQuality - fatigue) * 2, 32, 95);
  const restingHr = clamp(profile.baseline[2] - 4 + fatigue + stress - Math.round(hrv / 20), 45, 82);
  const sorenessAreas = pain >= 7 ? ["ankle", "hamstring"] : pain >= 5 ? ["quad"] : [];

  return {
    raw: { sleepQuality, fatigue, pain, stress, mood, motivation, confidence, focus, trainingLoad, sleepHours, manualHrv: hrv, manualRestingHr: restingHr, sorenessAreas, deviceSourceStatus: "manual" },
    duration,
    rpe,
    loadPoints: trainingLoad
  };
}

function checkInValue(rawValue, normalizedValue, sourceLabel = "user_input") {
  return { rawValue, normalizedValue, sourceLabel };
}

function buildDailyPlan({ athleteId, date, dailyIq, statuses, pain }) {
  const now = new Date().toISOString();
  const tasks = [];
  if (pain >= 7) {
    tasks.push(task("safety:pain-guardrail", "safety", "athleteiq.dailyPlan.tasks.painGuardrail.title", "athleteiq.dailyPlan.tasks.painGuardrail.description", "critical", ["high_pain"], "training"));
  }
  for (const key of habitKeys.filter((habitKey) => !statuses[habitKey]).slice(0, 3)) {
    tasks.push(task(`habit:${key}`, "habit", `athleteiq.dailyPlan.habits.${key}.title`, "athleteiq.dailyPlan.tasks.habit.description", dailyIq < 65 ? "medium" : "low", ["habit_gap"], "anytime"));
  }
  if (dailyIq < 65) {
    tasks.push(task("coach:readiness-review", "coach", "athleteiq.dailyPlan.tasks.completeCheckIn.title", "athleteiq.dailyPlan.tasks.completeCheckIn.description", "high", ["low_daily_iq"], "morning"));
  }

  return {
    athleteId,
    localDate: date,
    timezone: TIMEZONE,
    status: "active",
    tasks: tasks.slice(0, 7),
    recommendation: {
      intensity: pain >= 7 ? "recovery" : dailyIq >= 80 ? "high" : dailyIq >= 65 ? "moderate" : "low",
      type: pain >= 7 ? "recovery" : dailyIq >= 80 ? "high_intensity" : dailyIq >= 65 ? "controlled" : "recovery",
      durationRange: pain >= 7 ? "15-30" : dailyIq >= 80 ? "45-75" : dailyIq >= 65 ? "35-60" : "20-40",
      rationale: pain >= 7 ? ["high_pain"] : dailyIq >= 80 ? ["high_daily_iq"] : dailyIq >= 65 ? ["moderate_daily_iq"] : ["low_daily_iq"],
      blockedByPainGuardrail: pain >= 7
    },
    dataUsed: ["daily_iq", "pain_guardrail", "habit_records", "training_load"],
    missingData: [],
    generatedAt: now,
    updatedAt: now,
    version: "aiq-daily-plan-1250.1",
    auditHistory: [`live-product-generated:${now}`],
    generatedBy: GENERATED_BY
  };
}

function task(id, category, titleKey, descriptionKey, priority, sourceReasonCodes, dueWindow) {
  return { id, category, titleKey, descriptionKey, priority, sourceReasonCodes, dueWindow, completionState: "open" };
}

function buildAssessment({ athlete, athleteId, date, checkIn, trainerEmail }) {
  const movement = clamp(4 + ((checkIn.raw.focus + checkIn.raw.motivation) / 5), 1, 6);
  const social = clamp(4 + ((checkIn.raw.mood + checkIn.raw.confidence) / 6), 1, 6);
  const mental = clamp(3.5 + ((checkIn.raw.focus + checkIn.raw.confidence + checkIn.raw.motivation) / 9), 1, 6);
  const scores = Object.fromEntries(scoreKeys.map(([key, domain], index) => {
    const base = domain === "movement" ? movement : domain === "social" ? social : mental;
    return [key, {
      score: Math.round(clamp(base + ((index % 3) - 1) * 0.3, 1, 6) * 10) / 10,
      note: `${athlete.position} ${domain} marker recorded from Athlete IQ measurement.`,
      observer: trainerEmail,
      confidence: "high"
    }];
  }));
  const movementAverage = average(scoreKeys.filter(([, domain]) => domain === "movement").map(([key]) => scores[key].score));
  const socialAverage = average(scoreKeys.filter(([, domain]) => domain === "social").map(([key]) => scores[key].score));
  const mentalAverage = average(scoreKeys.filter(([, domain]) => domain === "mental").map(([key]) => scores[key].score));
  const ski = average([movementAverage, socialAverage, mentalAverage]);
  const now = new Date().toISOString();

  return {
    childId: athleteId,
    mode: "full",
    child: {
      name: athlete.name,
      birthDate: athlete.birthDate,
      ageGroup: "",
      dominantHand: "right",
      dominantEye: "right",
      dominantFoot: athlete.dominantFoot,
      knownTraits: athlete.traits,
      parentSignals: "Parent/guardian receives progress summaries through approved reporting."
    },
    session: {
      date,
      location: athlete.teamName,
      conductor: trainerEmail,
      observers: "",
      groupSize: "12",
      context: "structured",
      consentPhoto: true,
      consentReport: true
    },
    trainingLoad: {
      sessionType: "football-development",
      durationMinutes: checkIn.duration,
      rpe: checkIn.rpe,
      externalLoad: Math.round(checkIn.loadPoints * 1.15)
    },
    scores,
    notes: {
      general: "Measurement created from live Athlete IQ data enrichment.",
      movement: "Movement readiness aligned to daily load and soreness inputs.",
      social: "Coachability and communication reviewed in team context.",
      mental: "Confidence, focus, and motivation reflected from daily check-in.",
      adaptations: checkIn.raw.pain >= 7 ? "Reduced intensity and pain guardrail active." : "Standard progression available.",
      referral: checkIn.raw.pain >= 7 ? "Physio review recommended before high intensity work." : "No referral concern recorded."
    },
    attachments: [],
    computed: {
      movementAverage,
      socialAverage,
      mentalAverage,
      ski,
      completion: { done: scoreKeys.length, total: scoreKeys.length }
    },
    standardsVersionUsed: "live-product-2026-06",
    createdAt: now,
    updatedAt: now,
    generatedBy: GENERATED_BY,
    liveProductKey: `${athlete.key}:${date}`
  };
}

function canonicalMetric({ athleteId, date, source, key, value, unit, sourceMetric, organisationId = ORGANISATION_ID }) {
  const now = new Date().toISOString();
  return {
    metricId: `${athleteId}:${date}:${source}:${key}`,
    athleteId,
    organisationId,
    source,
    sourceMetric,
    canonicalKey: key,
    value,
    unit,
    confidence: "high",
    periodStart: `${date}T00:00:00.000Z`,
    periodEnd: `${date}T23:59:59.999Z`,
    date,
    normalisedAt: now,
    normalisationVersion: "1.0.0",
    processingState: "normalised",
    createdAt: now,
    updatedAt: now,
    generatedBy: GENERATED_BY
  };
}

async function upsertAndRead(collection, filter, update, setOnInsert = {}) {
  const now = new Date().toISOString();
  await collection.updateOne(filter, {
    $set: { ...update, updatedAt: now },
    $setOnInsert: { ...setOnInsert, createdAt: now }
  }, { upsert: true });
  return collection.findOne(filter);
}

const client = new MongoClient(uri, {
  appName: process.env.MONGODB_APP_NAME || "habigoal-live-product-data",
  maxPoolSize: 5,
  serverSelectionTimeoutMS: 10000
});

try {
  await client.connect();
  const db = client.db(dbName);
  const today = localDate();
  const dates = Array.from({ length: DAYS }, (_, index) => shiftDate(today, index - (DAYS - 1)));

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
  const assessments = db.collection("assessments");
  const canonicalMetrics = db.collection("canonical_metrics");

  for (const trainer of trainerProfiles) {
    await upsertAndRead(users, { email: trainer.email }, {
      name: trainer.name,
      email: trainer.email,
      roles: trainer.roles,
      teamIds: [],
      generatedBy: GENERATED_BY
    });
  }

  const athleteDocs = new Map();
  for (const [index, athlete] of athleteProfiles.entries()) {
    const [heightCm, weightKg, restingHeartRate, sleepTargetHours] = athlete.baseline;
    const doc = await upsertAndRead(children, { surveyId: athlete.key }, {
      surveyId: athlete.key,
      name: athlete.name,
      birthDate: athlete.birthDate,
      organisationId: ORGANISATION_ID,
      position: athlete.position,
      status: athlete.status,
      parentGuardianEmail: `guardian.${index + 1}@habigoal.app`,
      injuryHistoryFlags: athlete.injuryFlags,
      baselineProfile: {
        heightCm,
        weightKg,
        restingHeartRate,
        sleepTargetHours,
        confidenceBaseline: 72 + (index % 5) * 3,
        focusBaseline: 70 + (index % 4) * 4,
        motivationBaseline: 74 + (index % 4) * 3,
        stressBaseline: 34 + (index % 3) * 6,
        weeklyGoal: `${athlete.position} development block`,
        preferredTrainingDays: ["Monday", "Wednesday", "Friday"],
        supportPreferences: ["short coach cue", "visual progress", "recovery reminder"],
        onboardingCompletedAt: `${today}T08:00:00.000Z`,
        injuryNotes: athlete.injuryFlags.join(", "),
        medicalNotes: athlete.status === "injured" ? "Active return-to-play monitoring." : "",
        coachBaselineNotes: athlete.traits
      },
      consentPhoto: true,
      consentReport: true,
      dominantHand: "right",
      dominantEye: "right",
      dominantFoot: athlete.dominantFoot,
      knownTraits: athlete.traits,
      parentSignals: "Guardian approved Athlete IQ progress reporting workflows.",
      locale: "en",
      customAttributes: {
        clubId: ORGANISATION_ID,
        squad: athlete.teamSlug,
        createdForProductReadiness: true
      },
      generatedBy: GENERATED_BY
    });
    athleteDocs.set(athlete.key, { ...athlete, id: doc._id.toString() });
  }

  const teamDocs = new Map();
  for (const team of teamProfiles) {
    const athleteIds = athleteProfiles.filter((athlete) => athlete.teamSlug === team.slug).map((athlete) => athleteDocs.get(athlete.key).id);
    const doc = await upsertAndRead(teams, { slug: team.slug, generatedBy: GENERATED_BY }, {
      slug: team.slug,
      name: team.name,
      trainerEmails: team.trainerEmails,
      athleteIds,
      organisationId: ORGANISATION_ID,
      generatedBy: GENERATED_BY
    });
    teamDocs.set(team.slug, { ...team, id: doc._id.toString(), athleteIds });
    for (const athleteId of athleteIds) {
      await children.updateOne(
        { _id: new ObjectId(athleteId) },
        { $set: { teamId: doc._id.toString(), updatedAt: new Date().toISOString() } }
      );
    }
  }

  for (const trainer of trainerProfiles) {
    const teamIds = Array.from(teamDocs.values()).filter((team) => team.trainerEmails.includes(trainer.email)).map((team) => team.id);
    await users.updateOne({ email: trainer.email }, { $set: { teamIds, updatedAt: new Date().toISOString() } });
  }

  for (const athlete of athleteProfiles) {
    const athleteDoc = athleteDocs.get(athlete.key);
    const team = teamDocs.get(athlete.teamSlug);
    await users.updateOne(
      { email: `${athlete.key}@habigoal.app` },
      {
        $set: {
          name: athlete.name,
          email: `${athlete.key}@habigoal.app`,
          roles: ["athlete"],
          athleteId: athleteDoc.id,
          teamIds: [team.id],
          generatedBy: GENERATED_BY,
          updatedAt: new Date().toISOString()
        },
        $setOnInsert: { createdAt: new Date().toISOString() }
      },
      { upsert: true }
    );
  }

  let checkInCount = 0;
  let habitCount = 0;
  let trainingLoadCount = 0;
  let dailyIqCount = 0;
  let dailyPlanCount = 0;
  let metricCount = 0;
  let assessmentCount = 0;

  for (const [athleteIndex, athlete] of athleteProfiles.entries()) {
    const athleteDoc = athleteDocs.get(athlete.key);
    const team = teamDocs.get(athlete.teamSlug);
    const trainerEmail = team.trainerEmails[0];
    for (const [dayIndex, date] of dates.entries()) {
      const checkIn = buildCheckInValues(athleteIndex, dayIndex, athlete);
      const statuses = buildStatuses(athleteIndex, dayIndex);
      const submittedAt = `${date}T07:${String(15 + (athleteIndex % 30)).padStart(2, "0")}:00.000Z`;
      const values = {
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
        note: checkInValue(`${athlete.position} daily readiness submitted for ${team.name}.`, null)
      };
      const sourceLabels = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value.sourceLabel]));

      await checkIns.updateOne(
        { athleteId: athleteDoc.id, localDate: date, mode: "performance" },
        {
          $set: {
            athleteId: athleteDoc.id,
            mode: "performance",
            localDate: date,
            timezone: TIMEZONE,
            values,
            missingFields: [],
            sourceLabels,
            submittedAt,
            updatedAt: new Date().toISOString(),
            idempotencyKey: `${GENERATED_BY}:${athlete.key}:${date}:performance`,
            auditHistory: [`live-product-upsert:${new Date().toISOString()}`],
            generatedBy: GENERATED_BY
          },
          $setOnInsert: { createdAt: new Date().toISOString() }
        },
        { upsert: true }
      );
      checkInCount += 1;

      await habitRecords.updateOne(
        { athleteId: athleteDoc.id, date },
        {
          $set: {
            athleteId: athleteDoc.id,
            date,
            statuses,
            updatedAt: new Date().toISOString(),
            generatedBy: GENERATED_BY
          },
          $setOnInsert: { createdAt: new Date().toISOString() }
        },
        { upsert: true }
      );
      habitCount += 1;

      await trainingLoads.updateOne(
        { athleteId: athleteDoc.id, date, source: "trainer", generatedBy: GENERATED_BY },
        {
          $set: {
            athleteId: athleteDoc.id,
            date,
            source: "trainer",
            activityTypes: dayIndex % 3 === 0 ? ["speed", "finishing"] : dayIndex % 3 === 1 ? ["technical", "small-sided"] : ["recovery", "mobility"],
            durationMinutes: checkIn.duration,
            rpe: checkIn.rpe,
            loadPoints: checkIn.loadPoints,
            note: `${team.name} ${athlete.position} load entry.`,
            createdBy: trainerEmail,
            updatedAt: new Date().toISOString(),
            generatedBy: GENERATED_BY
          },
          $setOnInsert: { createdAt: new Date().toISOString() }
        },
        { upsert: true }
      );
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
      const load = safeLoadScore(checkIn.loadPoints);
      const dailyIq = weightedDailyIq({ readiness, mental, habit: habits, safeLoad: load, pain: checkIn.raw.pain });
      const painRiskLevel = checkIn.raw.pain >= 7 ? "high" : checkIn.raw.pain >= 5 ? "moderate" : checkIn.raw.pain > 1 ? "low" : "none";

      await dailyIqSnapshots.updateOne(
        { athleteId: athleteDoc.id, localDate: date, mode: "performance" },
        {
          $set: {
            calculationId: `${GENERATED_BY}:${athlete.key}:${date}`,
            athleteId: athleteDoc.id,
            localDate: date,
            timezone: TIMEZONE,
            mode: "performance",
            dailyIqScore: dailyIq,
            readinessScore: readiness,
            mentalEdgeScore: mental,
            habitScore: habits,
            safeLoadScore: load,
            painRiskLevel,
            confidence: "high",
            dataUsed: ["checkIn", "habits", "sessionLoad", "moduleRegistry"],
            missingData: [],
            explanation: [
              "Daily IQ confidence is high.",
              painRiskLevel === "high" ? "High pain caps Daily IQ at 60 and blocks high-intensity recommendations." : "Training recommendation uses current check-in, habit, and load data."
            ],
            algorithmVersion: "aiq-daily-iq-1220.1",
            moduleRegistryVersion: "athleteiq-module-registry-2026-06",
            componentWeights: { readiness: 0.4, mentalEdge: 0.3, habit: 0.2, safeLoad: 0.1 },
            painCapApplied: painRiskLevel === "high" ? 60 : painRiskLevel === "moderate" ? 75 : null,
            highIntensityBlocked: painRiskLevel === "high",
            createdAt: new Date().toISOString(),
            generatedBy: GENERATED_BY
          }
        },
        { upsert: true }
      );
      dailyIqCount += 1;

      await dailyPlans.updateOne(
        { athleteId: athleteDoc.id, localDate: date },
        { $set: buildDailyPlan({ athleteId: athleteDoc.id, date, dailyIq, statuses, pain: checkIn.raw.pain }) },
        { upsert: true }
      );
      dailyPlanCount += 1;

      if (checkIn.raw.pain >= 7 || (date === today && athlete.status === "injured")) {
        await painAlerts.updateOne(
          { athleteId: athleteDoc.id, localDate: date },
          {
            $set: {
              athleteId: athleteDoc.id,
              localDate: date,
              state: date === today ? "coach_review" : "monitor",
              riskLevel: checkIn.raw.pain >= 7 ? "high" : "moderate",
              painScore: checkIn.raw.pain,
              locations: checkIn.raw.sorenessAreas.length ? checkIn.raw.sorenessAreas : ["ankle"],
              reasonCodes: ["pain_threshold", "load_context"],
              requiredCopyKey: "athleteiq.painSafety.coachReview",
              auditHistory: [`live-product-upsert:${new Date().toISOString()}`],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              generatedBy: GENERATED_BY
            }
          },
          { upsert: true }
        );
      }

      const assessment = buildAssessment({ athlete: { ...athlete, teamName: team.name }, athleteId: athleteDoc.id, date, checkIn, trainerEmail });
      await assessments.updateOne(
        { liveProductKey: assessment.liveProductKey },
        { $set: assessment },
        { upsert: true }
      );
      assessmentCount += 1;

      const metrics = [
        canonicalMetric({ athleteId: athleteDoc.id, date, source: "check_in", key: "sleep_quality_score", value: checkIn.raw.sleepQuality, unit: "score_1_10", sourceMetric: "sleepQuality" }),
        canonicalMetric({ athleteId: athleteDoc.id, date, source: "check_in", key: "sleep_duration_minutes", value: Math.round(checkIn.raw.sleepHours * 60), unit: "minutes", sourceMetric: "sleepHours" }),
        canonicalMetric({ athleteId: athleteDoc.id, date, source: "check_in", key: "hrv_rmssd_ms", value: checkIn.raw.manualHrv, unit: "ms", sourceMetric: "manualHrv" }),
        canonicalMetric({ athleteId: athleteDoc.id, date, source: "check_in", key: "resting_heart_rate_bpm", value: checkIn.raw.manualRestingHr, unit: "bpm", sourceMetric: "manualRestingHr" }),
        canonicalMetric({ athleteId: athleteDoc.id, date, source: "check_in", key: "mood_score", value: checkIn.raw.mood, unit: "score_1_10", sourceMetric: "mood" }),
        canonicalMetric({ athleteId: athleteDoc.id, date, source: "check_in", key: "stress_score", value: checkIn.raw.stress, unit: "score_1_10", sourceMetric: "stress" }),
        canonicalMetric({ athleteId: athleteDoc.id, date, source: "check_in", key: "soreness_score", value: checkIn.raw.pain, unit: "score_1_10", sourceMetric: "pain" }),
        canonicalMetric({ athleteId: athleteDoc.id, date, source: "manual_coach", key: "session_rpe", value: checkIn.rpe, unit: "rpe_1_10", sourceMetric: "rpe" }),
        canonicalMetric({ athleteId: athleteDoc.id, date, source: "manual_coach", key: "session_duration_minutes", value: checkIn.duration, unit: "minutes", sourceMetric: "durationMinutes" }),
        canonicalMetric({ athleteId: athleteDoc.id, date, source: "manual_coach", key: "internal_load_points", value: checkIn.loadPoints, unit: "count", sourceMetric: "loadPoints" }),
        canonicalMetric({ athleteId: athleteDoc.id, date, source: "manual_coach", key: "total_distance_meters", value: 3400 + checkIn.loadPoints * 6, unit: "meters", sourceMetric: "sessionDistance" }),
        canonicalMetric({ athleteId: athleteDoc.id, date, source: "manual_coach", key: "high_speed_distance_meters", value: 180 + ((athleteIndex + dayIndex) % 8) * 35, unit: "meters", sourceMetric: "highSpeedDistance" }),
        canonicalMetric({ athleteId: athleteDoc.id, date, source: "manual_coach", key: "sprint_count", value: 4 + ((athleteIndex + dayIndex) % 9), unit: "count", sourceMetric: "sprints" }),
        canonicalMetric({ athleteId: athleteDoc.id, date, source: "manual_coach", key: "acceleration_count", value: 12 + ((athleteIndex + dayIndex) % 12), unit: "count", sourceMetric: "accelerations" }),
        canonicalMetric({ athleteId: athleteDoc.id, date, source: "manual_coach", key: "jump_height_cm", value: 24 + ((athleteIndex + dayIndex) % 14), unit: "meters", sourceMetric: "jumpHeightCm" }),
        canonicalMetric({ athleteId: athleteDoc.id, date, source: "manual_coach", key: "reaction_time_ms", value: 240 + ((athleteIndex + dayIndex) % 9) * 8, unit: "ms", sourceMetric: "reactionTime" })
      ];
      for (const metric of metrics) {
        await canonicalMetrics.updateOne({ metricId: metric.metricId }, { $set: metric }, { upsert: true });
      }
      metricCount += metrics.length;
    }

    const latest = buildCheckInValues(athleteIndex, dates.length - 1, athlete);
    const recommendationKey = latest.raw.pain >= 7 ? "pain-guardrail-review" : latest.raw.stress >= 6 ? "readiness-conversation" : "session-progression";
    await coachActions.updateOne(
      { athleteKey: athleteDoc.id, date: today, recommendationKey },
      {
        $set: {
          athleteKey: athleteDoc.id,
          date: today,
          recommendationKey,
          status: latest.raw.pain >= 7 ? "open" : "acknowledged",
          severity: latest.raw.pain >= 7 ? "critical" : "warning",
          sourceType: latest.raw.pain >= 7 ? "readiness-threshold" : "recommendation",
          sourceId: `${GENERATED_BY}:${athlete.key}:${today}`,
          detail: latest.raw.pain >= 7 ? "Pain threshold requires coach review before high-intensity work." : "Review readiness and confirm planned session progression.",
          actorName: trainerProfiles[athleteIndex % trainerProfiles.length].name,
          actorEmail: trainerProfiles[athleteIndex % trainerProfiles.length].email,
          updatedAt: new Date().toISOString(),
          generatedBy: GENERATED_BY
        },
        $setOnInsert: { createdAt: new Date().toISOString() }
      },
      { upsert: true }
    );
  }

  console.log(JSON.stringify({
    ok: true,
    database: dbName,
    generatedBy: GENERATED_BY,
    athletes: athleteProfiles.length,
    trainers: trainerProfiles.length,
    teams: teamProfiles.length,
    checkIns: checkInCount,
    habitRecords: habitCount,
    trainingLoads: trainingLoadCount,
    dailyIqSnapshots: dailyIqCount,
    dailyPlans: dailyPlanCount,
    assessments: assessmentCount,
    canonicalMetrics: metricCount,
    dateRange: { from: dates[0], to: today }
  }, null, 2));
} catch (error) {
  console.error(error);
  process.exit(1);
} finally {
  await client.close().catch(() => {});
}
