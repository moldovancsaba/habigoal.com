import { existsSync, readFileSync } from "node:fs";
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
const dbName = process.env.MONGODB_DB || "habigoal";

if (!uri) {
  console.error("MONGODB_URI is missing. Add it to .env or .env.local before running db:seed-showcase.");
  process.exit(1);
}

const client = new MongoClient(uri, {
  appName: process.env.MONGODB_APP_NAME || "habigoal",
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
  athlete("Nora Bálint", "2015-04-18", "10-12", "right", "right", "right", "Explosive first steps and strong intent in finishing moments.", "Responds well to simple cues and keeps improving when sleep is stable.", "en"),
  athlete("Leo Markovic", "2016-09-07", "7-9", "left", "left", "right", "Creative passer who can lose sharpness when the session becomes chaotic.", "Calmer pacing and early touches improve confidence quickly.", "hu"),
  athlete("Sara El Amrani", "2014-11-02", "10-12", "right", "left", "right", "Very coachable and consistent in technical repetition blocks.", "Shows clear readiness dips after school-heavy days.", "en"),
  athlete("Máté Horváth", "2017-02-13", "7-9", "right", "right", "left", "Dynamic mover with good balance and improving decision speed.", "Needs reminders on hydration and recovery routines.", "hu"),
  athlete("Yara Petrescu", "2018-06-25", "7-9", "left", "right", "left", "Strong confidence in duels and quick recovery after mistakes.", "Benefits from explicit session goals and positive reinforcement.", "en")
];

const conductors = [
  "dev@habigoal.local",
  "coach.one@habigoal.com",
  "coach.two@habigoal.com"
];

const locations = [
  "Budapest North Dome",
  "Sturovo Recovery Lab",
  "Vienna Technical Arena",
  "Debrecen Speed Court",
  "Bratislava Performance Hall"
];

try {
  await client.connect();
  const db = client.db(dbName);

  const existingChildren = await db.collection("children").find({
    generatedBy: "showcase-seed-v1"
  }).project({ _id: 1 }).toArray();
  const existingChildIds = existingChildren.map((item) => item._id.toString());

  await db.collection("assessments").deleteMany({
    $or: [
      { childId: { $in: existingChildIds } },
      { generatedBy: "showcase-seed-v1" }
    ]
  });
  await db.collection("children").deleteMany({ generatedBy: "showcase-seed-v1" });

  const now = new Date();
  const insertedChildren = [];
  const insertedAssessments = [];

  for (let athleteIndex = 0; athleteIndex < athletes.length; athleteIndex += 1) {
    const profile = athletes[athleteIndex];
    const childId = new ObjectId();
    const createdAt = new Date(now.getTime() - (90 - athleteIndex * 3) * 24 * 60 * 60 * 1000);
    const child = {
      _id: childId,
      surveyId: `showcase-athlete-${String(athleteIndex + 1).padStart(2, "0")}`,
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
      locale: profile.locale,
      createdAt: createdAt.toISOString(),
      updatedAt: now.toISOString(),
      generatedBy: "showcase-seed-v1"
    };
    insertedChildren.push(child);

    const base = baseProfileForAthlete(athleteIndex);
    for (let sessionIndex = 0; sessionIndex < 10; sessionIndex += 1) {
      const sessionDate = new Date(now.getTime() - (70 - sessionIndex * 7 - athleteIndex) * 24 * 60 * 60 * 1000);
      sessionDate.setHours(8 + ((athleteIndex + sessionIndex) % 6), 15, 0, 0);

      const readinessChecks = readinessCountForSession(base.readinessChecks, sessionIndex);
      const scores = buildScores(base, sessionIndex, readinessChecks);
      const computed = computeAssessment(scores);

      insertedAssessments.push({
        _id: new ObjectId(),
        childId: childId.toString(),
        mode: sessionIndex % 3 === 0 ? "full" : "rapid",
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
          date: sessionDate.toISOString().slice(0, 10),
          location: locations[(athleteIndex + sessionIndex) % locations.length],
          conductor: conductors[(athleteIndex + sessionIndex) % conductors.length],
          observers: "observer@habigoal.com",
          groupSize: sessionIndex % 2 === 0 ? "6-8" : "4-6",
          context: sessionIndex % 4 === 0 ? "event" : sessionIndex % 2 === 0 ? "structured" : "mixed",
          consentPhoto: true,
          consentReport: true
        },
        scores,
        notes: buildNotes(base, sessionIndex, readinessChecks, profile.locale),
        attachments: [],
        standardsVersionUsed: "v1",
        computed,
        createdAt: sessionDate.toISOString(),
        updatedAt: sessionDate.toISOString(),
        updateHistory: [],
        generatedBy: "showcase-seed-v1"
      });
    }
  }

  await db.collection("children").insertMany(insertedChildren);
  await db.collection("assessments").insertMany(insertedAssessments);

  console.log(JSON.stringify({
    ok: true,
    database: dbName,
    athletesInserted: insertedChildren.length,
    assessmentsInserted: insertedAssessments.length
  }, null, 2));
} finally {
  await client.close();
}

function athlete(name, birthDate, ageGroup, dominantHand, dominantEye, dominantFoot, knownTraits, parentSignals, locale) {
  return { name, birthDate, ageGroup, dominantHand, dominantEye, dominantFoot, knownTraits, parentSignals, locale };
}

function baseProfileForAthlete(index) {
  const archetypes = [
    { physical: 3.2, mental: 3.1, sportBrain: 3.0, readinessChecks: 4 },
    { physical: 3.8, mental: 3.5, sportBrain: 3.4, readinessChecks: 5 },
    { physical: 4.1, mental: 3.9, sportBrain: 3.7, readinessChecks: 6 },
    { physical: 3.5, mental: 3.3, sportBrain: 3.2, readinessChecks: 4 },
    { physical: 3.9, mental: 3.7, sportBrain: 3.8, readinessChecks: 6 }
  ];
  return archetypes[index % archetypes.length];
}

function readinessCountForSession(base, sessionIndex) {
  const wave = [0, 1, -1, 2, 0, -2, 1, 0, 2, -1][sessionIndex] ?? 0;
  return clamp(base + wave, 2, allQuestionKeys.length);
}

function buildScores(base, sessionIndex, readinessChecks) {
  const progress = sessionIndex * 0.16;
  const scores = {};
  const supportValues = {
    physical_pillar: roundedScore(base.physical + progress * 0.6 - 0.04 * (sessionIndex % 4)),
    mental_pillar: roundedScore(base.mental + progress * 0.5 + 0.05 * ((sessionIndex + 1) % 3)),
    sport_brain_pillar: roundedScore(base.sportBrain + progress * 0.75 + 0.08 * (sessionIndex % 2))
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
      note: sessionIndex % 3 === 0 ? "Showcase history generated for dashboard trend validation." : ""
    };
  });

  return scores;
}

function buildNotes(base, sessionIndex, readinessChecks, locale) {
  const fullMode = readinessChecks >= 6;
  const copy = locale === "hu"
    ? {
        generalFull: "Jól kezelte a teljes terhelést, és a késői akciókban is stabil maradt.",
        generalLight: "Tudatosabban kontrollált tempóblokkra volt szükség, mielőtt a minőség stabilizálódott.",
        adaptationsFull: "A következő foglalkozás maradhat kihívó, de a technikai tisztaságot tartsd meg.",
        adaptationsLight: "Adj világosabb kereteket, és csökkentsd a káoszt, amikor alacsonyabban indul a készenlét.",
        referral: "Ebben a bemutató rekordban nincs rögzített továbbküldési kockázat."
      }
    : {
        generalFull: "Handled the full session load with good consistency in late actions.",
        generalLight: "Needed a more controlled pacing block before quality stabilized.",
        adaptationsFull: "Keep the next session demanding but maintain technical clarity.",
        adaptationsLight: "Use clearer constraints and reduce chaos when readiness starts lower.",
        referral: "No referral concern recorded in this showcase record."
      };
  return {
    general: fullMode
      ? copy.generalFull
      : copy.generalLight,
    movement: `Physical readiness trending around ${roundedScore(base.physical + sessionIndex * 0.12)}.`,
    social: `Mental balance and coachability stayed ${sessionIndex % 2 === 0 ? "stable" : "responsive"} across the block.`,
    mental: "Focus and timing improved once the athlete settled into repeated constraints.",
    adaptations: fullMode
      ? copy.adaptationsFull
      : copy.adaptationsLight,
    referral: copy.referral
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
  const done = allQuestionKeys.filter((key) => typeof scores[key]?.score === "number").length;

  return {
    movementAverage,
    socialAverage,
    mentalAverage,
    ski,
    completion: { done, total: allQuestionKeys.length }
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
