import { existsSync, readFileSync } from "node:fs";
import crypto from "node:crypto";
import { MongoClient, ObjectId } from "mongodb";

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

loadEnvFile(".env");
loadEnvFile(".env.local");
loadEnvFile(".env.example");

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "survey";

if (!uri) {
  console.error("MONGODB_URI is missing. Add it to .env or .env.local before running db:seed-demo.");
  process.exit(1);
}

const client = new MongoClient(uri, {
  serverSelectionTimeoutMS: 10000,
  connectTimeoutMS: 10000
});

const questionGroups = {
  physical_pillar: ["sleep_hours", "sleep_quality", "energy_level", "body_feel", "fuel_hydration"],
  mental_pillar: ["mood_state", "stress_load", "confidence_level"],
  sport_brain_pillar: ["focus_level"]
};

const allQuestionKeys = [
  ...questionGroups.physical_pillar,
  ...questionGroups.mental_pillar,
  ...questionGroups.sport_brain_pillar
];

const athletes = [
  athlete("Amina Haddad", "2014-03-17", "10-12", "right", "right", "right", "Fast first step, needs calmer scanning under pressure.", "Trainer reports high intent and strong response to short technical cues."),
  athlete("Bence Tóth", "2017-06-04", "7-9", "left", "left", "left", "Excellent rhythm and coordination, tires when pace becomes chaotic.", "Trainer notes strong motivation and improving self-regulation."),
  athlete("Carlos Mendes", "2015-10-22", "10-12", "right", "right", "left", "Creative finisher, inconsistent tactical timing when rushed.", "Trainer wants more repetition in scan-before-receive patterns."),
  athlete("Dalia Rahman", "2018-01-11", "7-9", "right", "left", "right", "Strong body control and confidence in duels.", "Trainer sees clear gains when recovery and hydration are consistent."),
  athlete("Emir Kovács", "2016-08-29", "7-9", "right", "right", "right", "Good balance and mobility foundation, needs sharper decision speed.", "Trainer highlights improving confidence in tight spaces."),
  athlete("Farah Saleh", "2014-12-03", "10-12", "left", "left", "right", "Strong tactical curiosity and session focus.", "Trainer reports occasional readiness dips after school stress."),
  athlete("Gergő Farkas", "2019-04-15", "4-6", "right", "right", "right", "Energetic mover with emerging technical control.", "Trainer wants calmer breathing resets between blocks."),
  athlete("Hana Petrović", "2016-02-20", "10-12", "left", "right", "left", "Resilient and composed, benefits from structured cueing.", "Trainer notes stable readiness and strong finishing intent."),
  athlete("Isaac Moreau", "2015-07-09", "10-12", "right", "right", "right", "Physical output is high, but execution slips when fatigued.", "Trainer wants more controlled pressure and tactical patience."),
  athlete("Jázmin Szabó", "2018-09-27", "7-9", "right", "left", "right", "Quick learner with strong confidence in technical blocks.", "Trainer reports large gains when session goals are explicit."),
  athlete("Khalil Nasser", "2017-11-14", "7-9", "left", "left", "left", "Strong scan habits and composed passing decisions.", "Trainer sees readiness variation linked to sleep quality."),
  athlete("Lina Varga", "2014-05-31", "10-12", "right", "right", "left", "Well-rounded profile with high compliance and steady leadership.", "Trainer identifies psychological resilience as a major strength.")
];

const conductors = [
  { name: "Milan Vig", email: "milan@survey.app", roles: ["admin", "conductor"] },
  { name: "Sara Kovacs", email: "sara@survey.app", roles: ["conductor"] },
  { name: "Rashid Omar", email: "rashid@survey.app", roles: ["conductor"] }
];

const observers = [
  { name: "Julia Horvath", email: "julia@survey.app", roles: ["observer"] },
  { name: "Noah Salem", email: "noah@survey.app", roles: ["observer"] },
  { name: "Petra Nagy", email: "petra@survey.app", roles: ["observer"] }
];

const locations = [
  "Budapest North Dome",
  "Bratislava Performance Hall",
  "Vienna Technical Arena",
  "Sturovo Recovery Lab",
  "Debrecen Speed Court"
];

try {
  await client.connect();
  const db = client.db(dbName);

  await db.collection("users").bulkWrite(
    [...conductors, ...observers].map((user) => ({
      updateOne: {
        filter: { email: user.email.toLowerCase() },
        update: { $set: { ...user, email: user.email.toLowerCase() } },
        upsert: true
      }
    }))
  );

  const settingsCollection = db.collection("settings");
  const existingSettings = await settingsCollection.findOne({ _id: "global_settings" });
  await settingsCollection.updateOne(
    { _id: "global_settings" },
    {
      $set: {
        conductors: conductors.map((entry) => entry.email),
        observers: observers.map((entry) => entry.email),
        locations,
        company: existingSettings?.company || {
          name: "Survey",
          ico: "57474869",
          registered: "19.02.2026",
          legalForm: "Limited Liability Company",
          address: "Zeliarsky svah 29, Sturovo, Slovakia 943 01",
          shareCapital: "EUR 5 000",
          vatNo: "SK2122770606",
          website: "https://survey.app"
        },
        standards: existingSettings?.standards || {
          activeVersion: "v1",
          versions: { v1: { meta: { createdAt: new Date().toISOString(), status: "published", notes: "Initial baseline standards." } } }
        }
      }
    },
    { upsert: true }
  );

  const demoChildren = await db.collection("children").find({ surveyId: /^demo-athlete-/ }).project({ _id: 1 }).toArray();
  const demoChildIds = demoChildren.map((item) => item._id.toString());

  await db.collection("assessments").deleteMany({
    $or: [
      { childId: { $in: demoChildIds } },
      { generatedBy: { $in: ["demo-seed-v1", "demo-seed-v2"] } }
    ]
  });
  await db.collection("children").deleteMany({ surveyId: /^demo-athlete-/ });

  const insertedChildren = [];
  const insertedAssessments = [];
  const now = new Date();

  for (let athleteIndex = 0; athleteIndex < athletes.length; athleteIndex += 1) {
    const profile = athletes[athleteIndex];
    const childId = new ObjectId();
    const child = {
      _id: childId,
      surveyId: `demo-athlete-${String(athleteIndex + 1).padStart(2, "0")}`,
      name: profile.name,
      birthDate: profile.birthDate,
      ageGroup: profile.ageGroup,
      consentPhoto: true,
      consentReport: true,
      dominantHand: profile.dominantHand,
      dominantEye: profile.dominantEye,
      dominantFoot: profile.dominantFoot,
      knownTraits: profile.knownTraits,
      parentSignals: profile.parentSignals,
      locale: athleteIndex % 3 === 0 ? "en" : athleteIndex % 3 === 1 ? "hu" : "ar",
      createdAt: new Date(now.getTime() - (140 - athleteIndex) * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: now.toISOString(),
      generatedBy: "demo-seed-v2"
    };
    insertedChildren.push(child);

    const sessionCount = athleteIndex % 3 === 0 ? 10 : 9;
    const base = baseProfileForAthlete(athleteIndex);

    for (let sessionIndex = 0; sessionIndex < sessionCount; sessionIndex += 1) {
      const createdAt = new Date(now.getTime() - (sessionCount - sessionIndex) * (8 + (athleteIndex % 4)) * 24 * 60 * 60 * 1000);
      createdAt.setHours(9 + (sessionIndex % 5), 10, 0, 0);

      const readinessChecks = readinessCountForSession(base.readinessChecks, sessionIndex);
      const scores = buildScores(base, sessionIndex, readinessChecks);
      const computed = computeAssessment(scores);
      const conductor = conductors[(athleteIndex + sessionIndex) % conductors.length].email;
      const observerEmail = observers[(athleteIndex + sessionIndex) % observers.length].email;
      const location = locations[(athleteIndex + sessionIndex) % locations.length];
      insertedAssessments.push({
        _id: new ObjectId(),
        childId: childId.toString(),
        mode: sessionIndex % 4 === 0 ? "full" : "rapid",
        child: {
          name: profile.name,
          birthDate: profile.birthDate,
          ageGroup: profile.ageGroup,
          dominantHand: profile.dominantHand,
          dominantEye: profile.dominantEye,
          dominantFoot: profile.dominantFoot,
          knownTraits: profile.knownTraits,
          parentSignals: profile.parentSignals
        },
        session: {
          date: createdAt.toISOString().slice(0, 10),
          location,
          conductor,
          observers: observerEmail,
          groupSize: sessionIndex % 2 === 0 ? "6-8" : "4-6",
          context: sessionIndex % 5 === 0 ? "event" : sessionIndex % 2 === 0 ? "structured" : "mixed",
          consentPhoto: true,
          consentReport: true
        },
        scores,
        notes: buildNotes(base, sessionIndex, readinessChecks),
        attachments: [],
        standardsVersionUsed: "v1",
        computed,
        createdAt: createdAt.toISOString(),
        updatedAt: createdAt.toISOString(),
        updateHistory: [],
        generatedBy: "demo-seed-v2"
      });
    }
  }

  await db.collection("children").insertMany(insertedChildren);
  await db.collection("assessments").insertMany(insertedAssessments);

  console.log(JSON.stringify({
    ok: true,
    database: dbName,
    athletesInserted: insertedChildren.length,
    assessmentsInserted: insertedAssessments.length,
    conductors: conductors.length,
    observers: observers.length,
    locations: locations.length
  }, null, 2));
} finally {
  await client.close();
}

function athlete(name, birthDate, ageGroup, dominantHand, dominantEye, dominantFoot, knownTraits, parentSignals) {
  return { name, birthDate, ageGroup, dominantHand, dominantEye, dominantFoot, knownTraits, parentSignals };
}

function baseProfileForAthlete(index) {
  const archetypes = [
    { physical: 3.3, mental: 3.0, sportBrain: 3.1, readinessChecks: 4 },
    { physical: 3.6, mental: 3.5, sportBrain: 3.4, readinessChecks: 5 },
    { physical: 4.0, mental: 3.7, sportBrain: 3.8, readinessChecks: 6 },
    { physical: 3.1, mental: 3.2, sportBrain: 2.9, readinessChecks: 3 }
  ];
  return archetypes[index % archetypes.length];
}

function readinessCountForSession(base, sessionIndex) {
  const wave = [0, 1, -1, 2, 0, -2, 1, 0, 2, -1][sessionIndex] ?? 0;
  return clamp(base + wave, 2, allQuestionKeys.length);
}

function buildScores(base, sessionIndex, readinessChecks) {
  const progress = sessionIndex * 0.18;
  const cycle = (sessionIndex % 3) * 0.12;

  const scores = {};
  const supportValues = {
    physical_pillar: roundedScore(base.physical + progress * 0.65 - 0.05 * (sessionIndex % 4)),
    mental_pillar: roundedScore(base.mental + progress * 0.55 + 0.06 * ((sessionIndex + 1) % 3)),
    sport_brain_pillar: roundedScore(base.sportBrain + progress * 0.8 + 0.08 * (sessionIndex % 2))
  };

  const rankedQuestions = [
    "sleep_quality",
    "energy_level",
    "fuel_hydration",
    "mood_state",
    "confidence_level",
    "focus_level",
    "sleep_hours",
    "body_feel",
    "stress_load"
  ];
  const greenQuestions = new Set(rankedQuestions.slice(0, readinessChecks));

  allQuestionKeys.forEach((key) => {
    const pillarKey = key === "focus_level"
      ? "sport_brain_pillar"
      : questionGroups.mental_pillar.includes(key)
        ? "mental_pillar"
        : "physical_pillar";

    const baseValue = supportValues[pillarKey];
    const adjustment =
      key === "stress_load"
        ? -0.2
        : key === "sleep_hours" || key === "body_feel"
          ? -0.1
          : 0.1;
    const score = greenQuestions.has(key)
      ? roundedScore(baseValue + adjustment)
      : roundedScore(baseValue - 1 + adjustment - 0.15 * (sessionIndex % 2));

    scores[key] = {
      score,
      note: sessionIndex % 3 === 0 ? "Stable daily response with clear signal for session planning." : ""
    };
  });

  return scores;
}

function buildNotes(base, sessionIndex, readinessChecks) {
  const fullMode = readinessChecks >= 6;
  return {
    general: fullMode
      ? "Athlete handled the full block well and sustained quality in competitive actions."
      : "Athlete benefited from moderated pressure and clearer pacing through technical phases.",
    movement: `Physical readiness and recovery pattern trending around ${roundedScore(base.physical + sessionIndex * 0.12)}.`,
    social: `Mental balance and coachability remained ${sessionIndex % 2 === 0 ? "stable" : "responsive"} through the session.`,
    mental: `Focus and sport-brain timing improved after early rehearsal blocks.`,
    adaptations: fullMode
      ? "Keep intensity high with structured constraints and quick decision windows."
      : "Reduce chaos when readiness dips and preserve high-quality first actions.",
    referral: "No referral concern recorded in this demo session."
  };
}

function computeAssessment(scores) {
  const domainMap = {
    sleep_hours: "movement",
    sleep_quality: "movement",
    energy_level: "movement",
    body_feel: "movement",
    fuel_hydration: "movement",
    mood_state: "social",
    stress_load: "social",
    confidence_level: "social",
    focus_level: "mental"
  };

  const domainValues = {
    movement: [],
    social: [],
    mental: []
  };

  allQuestionKeys.forEach((key) => {
    const value = scores[key]?.score;
    if (typeof value === "number") {
      domainValues[domainMap[key]].push(value);
    }
  });

  const movementAverage = average(domainValues.movement);
  const socialAverage = average(domainValues.social);
  const mentalAverage = average(domainValues.mental);
  const pillarAverages = [
    average(questionGroups.physical_pillar.map((key) => scores[key]?.score).filter((value) => typeof value === "number")),
    average(questionGroups.mental_pillar.map((key) => scores[key]?.score).filter((value) => typeof value === "number")),
    average(questionGroups.sport_brain_pillar.map((key) => scores[key]?.score).filter((value) => typeof value === "number"))
  ].filter((value) => typeof value === "number");
  const ski = average(pillarAverages);
  const allKeys = allQuestionKeys;
  const done = allKeys.filter((key) => typeof scores[key]?.score === "number").length;

  return {
    movementAverage,
    socialAverage,
    mentalAverage,
    ski,
    completion: { done, total: allKeys.length }
  };
}

function average(values) {
  if (!values.length) return null;
  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2));
}

function roundedScore(value) {
  return clamp(Math.round(value * 10) / 10, 1, 5);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
