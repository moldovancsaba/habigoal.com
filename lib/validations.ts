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
