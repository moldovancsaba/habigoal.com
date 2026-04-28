import type { AssessmentPayload, EvidenceAttachment, ScoreEntry } from "@/types/assessment";

const modes = new Set(["rapid", "full"]);
const ageGroups = new Set(["4-6", "7-9", "10-12"]);
const contexts = new Set(["structured", "spontaneous", "mixed", "event"]);

function stringValue(value: unknown, max = 5000): string {
  return typeof value === "string" ? value.slice(0, max) : "";
}

function booleanValue(value: unknown): boolean {
  return typeof value === "boolean" ? value : false;
}

function scoreEntry(value: unknown): ScoreEntry {
  const entry = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const rawScore = entry.score;
  const score = typeof rawScore === "number" && rawScore >= 1 && rawScore <= 6 ? rawScore : "";
  const confidence = entry.confidence === "low" || entry.confidence === "medium" || entry.confidence === "high"
    ? entry.confidence
    : undefined;
  return {
    score,
    note: stringValue(entry.note),
    observer: stringValue(entry.observer, 120),
    confidence
  };
}

function attachment(value: unknown): EvidenceAttachment | null {
  const entry = value && typeof value === "object" ? value as Record<string, unknown> : null;
  if (!entry) return null;
  const url = stringValue(entry.url, 2000);
  if (!url.startsWith("https://")) return null;
  return {
    id: stringValue(entry.id, 120) || crypto.randomUUID(),
    name: stringValue(entry.name, 240),
    url,
    thumbUrl: stringValue(entry.thumbUrl, 2000),
    deleteUrl: stringValue(entry.deleteUrl, 2000),
    mimeType: stringValue(entry.mimeType, 120),
    size: typeof entry.size === "number" ? entry.size : 0,
    uploadedAt: stringValue(entry.uploadedAt, 80) || new Date().toISOString()
  };
}

function stringArray(value: unknown, maxItems = 100, maxLength = 240): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => stringValue(item, maxLength).trim())
    .filter(Boolean)
    .slice(0, maxItems);
}

export function parseAssessmentPayload(input: unknown): AssessmentPayload {
  const data = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const child = data.child && typeof data.child === "object" ? data.child as Record<string, unknown> : {};
  const session = data.session && typeof data.session === "object" ? data.session as Record<string, unknown> : {};
  const scores = data.scores && typeof data.scores === "object" ? data.scores as Record<string, unknown> : {};
  const notes = data.notes && typeof data.notes === "object" ? data.notes as Record<string, unknown> : {};
  const rawAttachments = Array.isArray(data.attachments) ? data.attachments : [];
  const mode = modes.has(String(data.mode)) ? data.mode as AssessmentPayload["mode"] : "rapid";
  const ageGroup = ageGroups.has(String(child.ageGroup)) ? child.ageGroup as AssessmentPayload["child"]["ageGroup"] : "7-9";
  const context = contexts.has(String(session.context)) ? session.context as AssessmentPayload["session"]["context"] : "structured";

  return {
    childId: stringValue(data.childId, 120).trim(),
    mode,
    child: {
      name: stringValue(child.name, 240),
      birthDate: stringValue(child.birthDate, 80),
      ageGroup,
      dominantHand: stringValue(child.dominantHand, 80),
      dominantEye: stringValue(child.dominantEye, 80),
      dominantFoot: stringValue(child.dominantFoot, 80),
      knownTraits: stringValue(child.knownTraits),
      parentSignals: stringValue(child.parentSignals)
    },
    session: {
      date: stringValue(session.date, 80),
      location: stringValue(session.location, 240),
      conductor: stringValue(session.conductor, 240),
      observers: stringValue(session.observers, 500),
      groupSize: stringValue(session.groupSize, 80),
      context,
      consentPhoto: booleanValue(session.consentPhoto),
      consentReport: booleanValue(session.consentReport)
    },
    scores: Object.fromEntries(Object.entries(scores).map(([key, value]) => [key, scoreEntry(value)])),
    notes: {
      general: stringValue(notes.general),
      movement: stringValue(notes.movement),
      social: stringValue(notes.social),
      mental: stringValue(notes.mental),
      adaptations: stringValue(notes.adaptations),
      referral: stringValue(notes.referral)
    },
    attachments: rawAttachments.map(attachment).filter((item): item is EvidenceAttachment => Boolean(item)).slice(0, 20)
  };
}

export interface SettingsPayload {
  conductors: string[];
  observers: string[];
  locations: string[];
  appVersion: string;
  company: {
    name: string;
    ico: string;
    registered: string;
    legalForm: string;
    address: string;
    shareCapital: string;
    vatNo: string;
    website: string;
  };
}

export function parseSettingsPayload(input: unknown): SettingsPayload {
  const data = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const company = data.company && typeof data.company === "object" ? (data.company as Record<string, unknown>) : {};
  return {
    conductors: stringArray(data.conductors, 100, 240),
    observers: stringArray(data.observers, 100, 240),
    locations: stringArray(data.locations, 100, 240),
    appVersion: stringValue(data.appVersion, 40).trim(),
    company: {
      name: stringValue(company.name, 240).trim(),
      ico: stringValue(company.ico, 120).trim(),
      registered: stringValue(company.registered, 120).trim(),
      legalForm: stringValue(company.legalForm, 240).trim(),
      address: stringValue(company.address, 500).trim(),
      shareCapital: stringValue(company.shareCapital, 120).trim(),
      vatNo: stringValue(company.vatNo, 120).trim(),
      website: stringValue(company.website, 240).trim()
    }
  };
}

export interface UserPayload {
  name: string;
  roles: ("conductor" | "observer")[];
}

export function parseUserPayload(input: unknown): UserPayload {
  const data = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const roleValues = Array.isArray(data.roles) ? data.roles : [];
  const allowedRoleSet = new Set(["conductor", "observer"]);
  const roles = roleValues
    .map((role) => String(role).toLowerCase())
    .filter((role): role is "conductor" | "observer" => allowedRoleSet.has(role))
    .slice(0, 2);

  return {
    name: stringValue(data.name, 240).trim(),
    roles: Array.from(new Set(roles))
  };
}

export interface ChildPayload {
  name: string;
  birthDate: string;
  dominantHand: string;
  dominantEye: string;
  dominantFoot: string;
  knownTraits: string;
  parentSignals: string;
}

export function parseChildPayload(input: unknown): ChildPayload {
  const data = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  return {
    name: stringValue(data.name, 240).trim(),
    birthDate: stringValue(data.birthDate, 80).trim(),
    dominantHand: stringValue(data.dominantHand, 80),
    dominantEye: stringValue(data.dominantEye, 80),
    dominantFoot: stringValue(data.dominantFoot, 80),
    knownTraits: stringValue(data.knownTraits),
    parentSignals: stringValue(data.parentSignals)
  };
}
