import { createServer } from "node:http";
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

loadEnvFile(".env.local");
loadEnvFile(".env.example");

const port = Number(process.env.SURVEY_LOCAL_SERVER_PORT || process.env.PORT || 4001);
const mongodbUri = process.env.MONGODB_URI;
const mongodbDb = process.env.MONGODB_DB || "survey";
const enforceAuth = process.env.SURVEY_ENFORCE_AUTH === "true" || process.env.KIDEX_ENFORCE_AUTH === "true";

if (!mongodbUri) {
  console.error("MONGODB_URI is missing. Add it to .env.local before starting the local server.");
  process.exit(1);
}

const client = new MongoClient(mongodbUri, {
  serverSelectionTimeoutMS: 10000,
  connectTimeoutMS: 10000
});

await client.connect();
const db = client.db(mongodbDb);

function json(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, x-survey-role",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
  });
  res.end(JSON.stringify(payload, null, 2));
}

function toJsonId(doc) {
  if (!doc) return null;
  return JSON.parse(
    JSON.stringify(doc, (_key, value) => {
      if (value instanceof ObjectId) return value.toString();
      return value;
    })
  );
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (chunks.length === 0) return {};
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

function requireRole(req, allowedRoles) {
  if (!enforceAuth) return null;
  const header = req.headers["x-survey-role"];
  const roles = String(Array.isArray(header) ? header.join(",") : header || "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
  if (roles.length === 0) {
    return { status: 401, body: { error: "Missing x-survey-role header", code: "AUTH_REQUIRED" } };
  }
  if (!roles.some((role) => allowedRoles.includes(role))) {
    return { status: 403, body: { error: "Insufficient role", code: "FORBIDDEN" } };
  }
  return null;
}

function parseChildPayload(input) {
  const data = input && typeof input === "object" ? input : {};
  const string = (value, max = 5000) => (typeof value === "string" ? value.slice(0, max).trim() : "");
  const bool = (value) => typeof value === "boolean" ? value : false;
  const ageGroup = ["4-6", "7-9", "10-12"].includes(string(data.ageGroup, 10)) ? string(data.ageGroup, 10) : "";
  return {
    surveyId: string(data.surveyId ?? data.kidexId, 120) || undefined,
    name: string(data.name, 240),
    birthDate: string(data.birthDate, 80),
    ageGroup,
    consentPhoto: bool(data.consentPhoto),
    consentReport: bool(data.consentReport),
    dominantHand: string(data.dominantHand, 80),
    dominantEye: string(data.dominantEye, 80),
    dominantFoot: string(data.dominantFoot, 80),
    knownTraits: string(data.knownTraits),
    parentSignals: string(data.parentSignals)
  };
}

function parseAssessmentPayload(input) {
  const data = input && typeof input === "object" ? input : {};
  const child = data.child && typeof data.child === "object" ? data.child : {};
  const session = data.session && typeof data.session === "object" ? data.session : {};
  const string = (value, max = 5000) => (typeof value === "string" ? value.slice(0, max).trim() : "");
  const bool = (value) => typeof value === "boolean" ? value : false;
  const mode = ["rapid", "full"].includes(String(data.mode)) ? data.mode : "rapid";
  const ageGroup = ["4-6", "7-9", "10-12"].includes(string(child.ageGroup, 10)) ? string(child.ageGroup, 10) : "7-9";
  const context = ["structured", "spontaneous", "mixed", "event"].includes(String(session.context)) ? session.context : "structured";

  return {
    childId: string(data.childId, 120),
    mode,
    child: {
      name: string(child.name, 240),
      birthDate: string(child.birthDate, 80),
      ageGroup,
      dominantHand: string(child.dominantHand, 80),
      dominantEye: string(child.dominantEye, 80),
      dominantFoot: string(child.dominantFoot, 80),
      knownTraits: string(child.knownTraits),
      parentSignals: string(child.parentSignals)
    },
    session: {
      date: string(session.date, 80),
      location: string(session.location, 240),
      conductor: string(session.conductor, 240),
      observers: string(session.observers, 500),
      groupSize: string(session.groupSize, 80),
      context,
      consentPhoto: bool(session.consentPhoto),
      consentReport: bool(session.consentReport)
    },
    scores: data.scores && typeof data.scores === "object" ? data.scores : {},
    notes: data.notes && typeof data.notes === "object" ? data.notes : {},
    attachments: Array.isArray(data.attachments) ? data.attachments.slice(0, 20) : [],
    computed: data.computed && typeof data.computed === "object" ? data.computed : {}
  };
}

function parseSettingsPayload(input) {
  const data = input && typeof input === "object" ? input : {};
  const company = data.company && typeof data.company === "object" ? data.company : {};
  const standards = data.standards && typeof data.standards === "object" ? data.standards : {};
  const array = (value) => Array.isArray(value) ? value.map((item) => String(item).trim()).filter(Boolean).slice(0, 100) : [];
  const string = (value, max = 5000) => (typeof value === "string" ? value.slice(0, max).trim() : "");
  return {
    conductors: array(data.conductors),
    observers: array(data.observers),
    locations: array(data.locations),
    company: {
      name: string(company.name, 240),
      ico: string(company.ico, 120),
      registered: string(company.registered, 120),
      legalForm: string(company.legalForm, 240),
      address: string(company.address, 500),
      shareCapital: string(company.shareCapital, 120),
      vatNo: string(company.vatNo, 120),
      website: string(company.website, 240)
    },
    standards: {
      activeVersion: string(standards.activeVersion, 120) || "v1",
      versions: standards.versions && typeof standards.versions === "object" ? standards.versions : {}
    }
  };
}

function parseUserPayload(input) {
  const data = input && typeof input === "object" ? input : {};
  const roleValues = Array.isArray(data.roles) ? data.roles : [];
  const roles = Array.from(
    new Set(
      roleValues
        .map((role) => String(role).trim().toLowerCase())
        .filter((role) => ["admin", "conductor", "observer"].includes(role))
    )
  );
  return {
    name: typeof data.name === "string" ? data.name.trim().slice(0, 240) : undefined,
    email: typeof data.email === "string" ? data.email.trim().toLowerCase().slice(0, 240) : "",
    roles
  };
}

async function handleChildren(req, res, pathname) {
  if (req.method === "GET" && pathname === "/api/children") {
    const guard = requireRole(req, ["admin", "conductor", "observer"]);
    if (guard) return json(res, guard.status, guard.body);
    const deleted = new URL(req.url, `http://localhost:${port}`).searchParams.get("deleted") === "true";
    const docs = await db.collection("children").find({ deletedAt: deleted ? { $exists: true } : { $exists: false } }).sort({ name: 1 }).toArray();
    return json(res, 200, docs.map(toJsonId));
  }

  if (req.method === "POST" && pathname === "/api/children") {
    const guard = requireRole(req, ["admin", "conductor"]);
    if (guard) return json(res, guard.status, guard.body);
    const body = parseChildPayload(await readBody(req));
    if (!body.name || !body.birthDate) return json(res, 400, { error: "name and birthDate are required", code: "VALIDATION_ERROR" });
    const now = new Date().toISOString();
    const existing = await db.collection("children").findOne({ name: body.name, birthDate: body.birthDate });
    if (existing) {
      await db.collection("children").updateOne({ _id: existing._id }, { $set: { ...body, updatedAt: now }, $unset: { kidexId: "" } });
      return json(res, 200, toJsonId({ ...existing, ...body, updatedAt: now }));
    }
    const doc = { ...body, surveyId: body.surveyId || crypto.randomUUID(), createdAt: now, updatedAt: now };
    const result = await db.collection("children").insertOne(doc);
    return json(res, 201, { ...doc, _id: result.insertedId.toString() });
  }

  const childIdMatch = pathname.match(/^\/api\/children\/([^/]+)$/);
  if (req.method === "GET" && childIdMatch) {
    const guard = requireRole(req, ["admin", "conductor", "observer"]);
    if (guard) return json(res, guard.status, guard.body);
    if (!ObjectId.isValid(childIdMatch[1])) return json(res, 400, { error: "Invalid child id", code: "VALIDATION_ERROR" });
    const doc = await db.collection("children").findOne({ _id: new ObjectId(childIdMatch[1]), deletedAt: { $exists: false } });
    return doc ? json(res, 200, toJsonId(doc)) : json(res, 404, { error: "Child not found", code: "NOT_FOUND" });
  }

  const historyMatch = pathname.match(/^\/api\/children\/([^/]+)\/history$/);
  if (req.method === "GET" && historyMatch) {
    const guard = requireRole(req, ["admin", "conductor", "observer"]);
    if (guard) return json(res, guard.status, guard.body);
    if (!ObjectId.isValid(historyMatch[1])) return json(res, 400, { error: "Invalid child id", code: "VALIDATION_ERROR" });
    const child = await db.collection("children").findOne({ _id: new ObjectId(historyMatch[1]), deletedAt: { $exists: false } });
    if (!child) return json(res, 404, { error: "Child not found", code: "NOT_FOUND" });
    const assessments = await db.collection("assessments").find({
      deletedAt: { $exists: false },
      $or: [
        { childId: historyMatch[1] },
        { "child.name": child.name, "child.birthDate": child.birthDate }
      ]
    }).sort({ createdAt: 1 }).toArray();
    return json(res, 200, { child: toJsonId(child), assessments: assessments.map(toJsonId) });
  }

  return false;
}

async function handleAssessments(req, res, pathname) {
  if (req.method === "GET" && pathname === "/api/assessments") {
    const guard = requireRole(req, ["admin", "conductor", "observer"]);
    if (guard) return json(res, guard.status, guard.body);
    const deleted = new URL(req.url, `http://localhost:${port}`).searchParams.get("deleted") === "true";
    const docs = await db.collection("assessments").find(
      deleted ? { deletedAt: { $exists: true } } : { deletedAt: { $exists: false } }
    ).sort({ updatedAt: -1 }).limit(100).toArray();
    return json(res, 200, { assessments: docs.map(toJsonId) });
  }

  if (req.method === "POST" && pathname === "/api/assessments") {
    const guard = requireRole(req, ["admin", "conductor"]);
    if (guard) return json(res, guard.status, guard.body);
    const body = parseAssessmentPayload(await readBody(req));
    if (!body.child?.name || !body.child?.birthDate || !body.session?.date) {
      return json(res, 400, { error: "child.name, child.birthDate and session.date are required", code: "VALIDATION_ERROR" });
    }
    const now = new Date().toISOString();
    const doc = { ...body, createdAt: now, updatedAt: now, updateHistory: [] };
    const result = await db.collection("assessments").insertOne(doc);
    return json(res, 201, { ...doc, _id: result.insertedId.toString() });
  }

  const assessmentIdMatch = pathname.match(/^\/api\/assessments\/([^/]+)$/);
  if (req.method === "GET" && assessmentIdMatch) {
    const guard = requireRole(req, ["admin", "conductor", "observer"]);
    if (guard) return json(res, guard.status, guard.body);
    if (!ObjectId.isValid(assessmentIdMatch[1])) return json(res, 400, { error: "Invalid assessment id", code: "VALIDATION_ERROR" });
    const doc = await db.collection("assessments").findOne({ _id: new ObjectId(assessmentIdMatch[1]), deletedAt: { $exists: false } });
    return doc ? json(res, 200, { assessment: toJsonId(doc) }) : json(res, 404, { error: "Assessment not found", code: "NOT_FOUND" });
  }

  return false;
}

async function handleSettings(req, res, pathname) {
  if (pathname !== "/api/settings") return false;
  if (req.method === "GET") {
    const guard = requireRole(req, ["admin", "conductor", "observer"]);
    if (guard) return json(res, guard.status, guard.body);
    const doc = await db.collection("settings").findOne({ _id: "global_settings" });
    if (!doc) return json(res, 200, {});
    const { _id, ...rest } = doc;
    return json(res, 200, rest);
  }

  if (req.method === "POST") {
    const guard = requireRole(req, ["admin"]);
    if (guard) return json(res, guard.status, guard.body);
    const body = parseSettingsPayload(await readBody(req));
    await db.collection("settings").updateOne({ _id: "global_settings" }, { $set: body }, { upsert: true });
    return json(res, 200, body);
  }

  return false;
}

async function handleUsers(req, res, pathname) {
  if (pathname !== "/api/users") return false;
  if (req.method === "GET") {
    const guard = requireRole(req, ["admin", "conductor", "observer"]);
    if (guard) return json(res, guard.status, guard.body);
    const email = new URL(req.url, `http://localhost:${port}`).searchParams.get("email");
    const filter = email ? { email: email.toLowerCase().trim() } : {};
    const docs = await db.collection("users").find(filter).sort({ email: 1 }).toArray();
    return json(res, 200, docs.map((doc) => ({
      id: doc._id.toString(),
      name: doc.name,
      email: doc.email,
      roles: doc.roles || []
    })));
  }

  if (req.method === "POST") {
    const guard = requireRole(req, ["admin"]);
    if (guard) return json(res, guard.status, guard.body);
    const body = parseUserPayload(await readBody(req));
    if (!body.email) return json(res, 400, { error: "email is required", code: "VALIDATION_ERROR" });
    await db.collection("users").updateOne(
      { email: body.email },
      { $set: { name: body.name, email: body.email, roles: body.roles } },
      { upsert: true }
    );
    return json(res, 200, body);
  }

  return false;
}

const server = createServer(async (req, res) => {
  try {
    if (!req.url || !req.method) return json(res, 400, { error: "Invalid request", code: "VALIDATION_ERROR" });
    const { pathname } = new URL(req.url, `http://localhost:${port}`);

    if (req.method === "OPTIONS") return json(res, 204, {});

    if (pathname === "/" || pathname === "/api") {
      return json(res, 200, {
        ok: true,
        app: "survey-local-server",
        database: mongodbDb,
        endpoints: [
          "GET /api/health",
          "GET,POST /api/children",
          "GET /api/children/:id",
          "GET /api/children/:id/history",
          "GET,POST /api/assessments",
          "GET /api/assessments/:id",
          "GET,POST /api/settings",
          "GET,POST /api/users"
        ]
      });
    }

    if (pathname === "/api/health") {
      return json(res, 200, {
        ok: true,
        services: {
          mongodb: true,
          imgbb: Boolean(process.env.IMGBB_API_KEY)
        },
        auth: {
          enforced: enforceAuth
        }
      });
    }

    const handled = await handleChildren(req, res, pathname)
      || await handleAssessments(req, res, pathname)
      || await handleSettings(req, res, pathname)
      || await handleUsers(req, res, pathname);

    if (handled === false) {
      return json(res, 404, { error: "Not found", code: "NOT_FOUND" });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return json(res, 500, { error: message, code: "UNKNOWN_ERROR" });
  }
});

server.listen(port, () => {
  console.log(JSON.stringify({
    ok: true,
    server: "survey-local-server",
    url: `http://localhost:${port}`,
    database: mongodbDb,
    authEnforced: enforceAuth
  }, null, 2));
});

process.on("SIGINT", async () => {
  server.close();
  await client.close();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  server.close();
  await client.close();
  process.exit(0);
});
