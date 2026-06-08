import type { AssessmentPayload, EvidenceAttachment, ScoreEntry } from "@/types/assessment";

const modes = new Set(["rapid", "full"]);
const contexts = new Set(["structured", "spontaneous", "mixed", "event"]);

function stringValue(value: unknown, max = 5000): string {
  return typeof value === "string" ? value.slice(0, max) : "";
}

function booleanValue(value: unknown): boolean {
  return typeof value === "boolean" ? value : false;
}

function numberValue(value: unknown, min?: number, max?: number): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  if (typeof min === "number" && value < min) return undefined;
  if (typeof max === "number" && value > max) return undefined;
  return value;
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
  const trainingLoad = data.trainingLoad && typeof data.trainingLoad === "object" ? data.trainingLoad as Record<string, unknown> : {};
  const scores = data.scores && typeof data.scores === "object" ? data.scores as Record<string, unknown> : {};
  const notes = data.notes && typeof data.notes === "object" ? data.notes as Record<string, unknown> : {};
  const rawAttachments = Array.isArray(data.attachments) ? data.attachments : [];
  const mode = modes.has(String(data.mode)) ? data.mode as AssessmentPayload["mode"] : "rapid";
  const context = contexts.has(String(session.context)) ? session.context as AssessmentPayload["session"]["context"] : "structured";

  return {
    childId: stringValue(data.childId, 120).trim(),
    mode,
    child: {
      name: stringValue(child.name, 240),
      birthDate: stringValue(child.birthDate, 80),
      ageGroup: "7-9",
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
    trainingLoad: {
      sessionType: stringValue(trainingLoad.sessionType, 120),
      durationMinutes: numberValue(trainingLoad.durationMinutes, 0, 360),
      rpe: numberValue(trainingLoad.rpe, 1, 10),
      externalLoad: numberValue(trainingLoad.externalLoad, 0, 50000)
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
  alerting: {
    dailyDigestEnabled: boolean;
    missedCheckInCutoffHour: number;
    watchReadinessThreshold: number;
    supportReadinessThreshold: number;
  };
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
  standards: {
    activeVersion: string;
    versions: Record<string, unknown>;
  };
}

export function parseSettingsPayload(input: unknown): SettingsPayload {
  const data = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const company = data.company && typeof data.company === "object" ? (data.company as Record<string, unknown>) : {};
  const alerting = data.alerting && typeof data.alerting === "object" ? (data.alerting as Record<string, unknown>) : {};
  return {
    conductors: stringArray(data.conductors, 100, 240),
    observers: stringArray(data.observers, 100, 240),
    locations: stringArray(data.locations, 100, 240),
    alerting: {
      dailyDigestEnabled: booleanValue(alerting.dailyDigestEnabled),
      missedCheckInCutoffHour: numberValue(alerting.missedCheckInCutoffHour, 0, 23) ?? 12,
      watchReadinessThreshold: numberValue(alerting.watchReadinessThreshold, 1, 5) ?? 4,
      supportReadinessThreshold: numberValue(alerting.supportReadinessThreshold, 1, 5) ?? 3
    },
    company: {
      name: stringValue(company.name, 240).trim(),
      ico: stringValue(company.ico, 120).trim(),
      registered: stringValue(company.registered, 120).trim(),
      legalForm: stringValue(company.legalForm, 240).trim(),
      address: stringValue(company.address, 500).trim(),
      shareCapital: stringValue(company.shareCapital, 120).trim(),
      vatNo: stringValue(company.vatNo, 120).trim(),
      website: stringValue(company.website, 240).trim()
    },
    standards: {
      activeVersion: stringValue((data.standards as Record<string, unknown>)?.activeVersion, 120).trim() || "v1",
      versions: ((data.standards as Record<string, unknown>)?.versions as Record<string, unknown>) || {}
    }
  };
}

export interface UserPayload {
  name?: string;
  email: string;
  roles: ("admin" | "trainer" | "athlete")[];
  athleteId?: string;
  teamIds?: string[];
}

export function parseUserPayload(input: unknown): UserPayload {
  const data = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const roleValues = Array.isArray(data.roles) ? data.roles : [];
  const roleAliases: Record<string, "admin" | "trainer" | "athlete"> = {
    admin: "admin",
    trainer: "trainer",
    athlete: "athlete",
    conductor: "trainer",
    observer: "athlete"
  };
  const roles = roleValues
    .map((role) => roleAliases[String(role).toLowerCase()])
    .filter((role): role is "admin" | "trainer" | "athlete" => Boolean(role));
  const teamIds = stringArray(data.teamIds, 100, 120);
  const athleteId = stringValue(data.athleteId, 120).trim() || undefined;

  return {
    name: data.name ? stringValue(data.name, 240).trim() : undefined,
    email: stringValue(data.email, 240).trim().toLowerCase(),
    roles: Array.from(new Set(roles)).slice(0, 1),
    athleteId,
    teamIds
  };
}

export interface ChildPayload {
  surveyId?: string;
  name: string;
  birthDate: string;
  organisationId?: string;
  teamId?: string;
  position?: string;
  status?: "active" | "injured" | "unavailable" | "trialist" | "archived";
  parentGuardianUserId?: string;
  parentGuardianEmail?: string;
  injuryHistoryFlags?: string[];
  customAttributes?: Record<string, string | number | boolean>;
  seasonHistory?: Array<{ season: string; teamId?: string; notes?: string }>;
  baselineProfile: {
    heightCm?: number;
    weightKg?: number;
    wingspanCm?: number;
    restingHeartRate?: number;
    sleepTargetHours?: number;
    cognitiveScore?: number;
    confidenceBaseline?: number;
    focusBaseline?: number;
    motivationBaseline?: number;
    stressBaseline?: number;
    injuryNotes: string;
    medicalNotes: string;
    coachBaselineNotes: string;
  };
  consentPhoto: boolean;
  consentReport: boolean;
  dominantHand: string;
  dominantEye: string;
  dominantFoot: string;
  knownTraits: string;
  parentSignals: string;
}

export function parseChildPayload(input: unknown): ChildPayload {
  const data = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const statusRaw = stringValue(data.status, 40);
  const status = ["active", "injured", "unavailable", "trialist", "archived"].includes(statusRaw)
    ? (statusRaw as ChildPayload["status"])
    : undefined;
  const customAttributes =
    data.customAttributes && typeof data.customAttributes === "object"
      ? (data.customAttributes as Record<string, string | number | boolean>)
      : undefined;
  const seasonHistory = Array.isArray(data.seasonHistory)
    ? data.seasonHistory
        .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
        .map((item) => ({
          season: stringValue(item.season, 40),
          teamId: stringValue(item.teamId, 120) || undefined,
          notes: stringValue(item.notes, 500) || undefined,
        }))
        .filter((item) => item.season)
    : undefined;

  return {
    surveyId: stringValue(data.surveyId ?? data.kidexId, 120).trim() || undefined,
    name: stringValue(data.name, 240).trim(),
    birthDate: stringValue(data.birthDate, 80).trim(),
    organisationId: stringValue(data.organisationId, 120).trim() || undefined,
    teamId: stringValue(data.teamId, 120).trim() || undefined,
    position: stringValue(data.position, 80).trim() || undefined,
    status,
    parentGuardianUserId: stringValue(data.parentGuardianUserId, 120).trim() || undefined,
    parentGuardianEmail: stringValue(data.parentGuardianEmail, 240).trim() || undefined,
    injuryHistoryFlags: stringArray(data.injuryHistoryFlags, 20, 80),
    customAttributes,
    seasonHistory,
    baselineProfile: {
      heightCm: numberValue(data.heightCm ?? (data.baselineProfile as Record<string, unknown> | undefined)?.heightCm, 50, 260),
      weightKg: numberValue(data.weightKg ?? (data.baselineProfile as Record<string, unknown> | undefined)?.weightKg, 15, 250),
      wingspanCm: numberValue(data.wingspanCm ?? (data.baselineProfile as Record<string, unknown> | undefined)?.wingspanCm, 50, 300),
      restingHeartRate: numberValue(data.restingHeartRate ?? (data.baselineProfile as Record<string, unknown> | undefined)?.restingHeartRate, 20, 220),
      sleepTargetHours: numberValue(data.sleepTargetHours ?? (data.baselineProfile as Record<string, unknown> | undefined)?.sleepTargetHours, 4, 14),
      cognitiveScore: numberValue(data.cognitiveScore ?? (data.baselineProfile as Record<string, unknown> | undefined)?.cognitiveScore, 40, 200),
      confidenceBaseline: numberValue(data.confidenceBaseline ?? (data.baselineProfile as Record<string, unknown> | undefined)?.confidenceBaseline, 1, 10),
      focusBaseline: numberValue(data.focusBaseline ?? (data.baselineProfile as Record<string, unknown> | undefined)?.focusBaseline, 1, 10),
      motivationBaseline: numberValue(data.motivationBaseline ?? (data.baselineProfile as Record<string, unknown> | undefined)?.motivationBaseline, 1, 10),
      stressBaseline: numberValue(data.stressBaseline ?? (data.baselineProfile as Record<string, unknown> | undefined)?.stressBaseline, 1, 10),
      injuryNotes: stringValue(data.injuryNotes ?? (data.baselineProfile as Record<string, unknown> | undefined)?.injuryNotes),
      medicalNotes: stringValue(data.medicalNotes ?? (data.baselineProfile as Record<string, unknown> | undefined)?.medicalNotes),
      coachBaselineNotes: stringValue(data.coachBaselineNotes ?? (data.baselineProfile as Record<string, unknown> | undefined)?.coachBaselineNotes)
    },
    consentPhoto: booleanValue(data.consentPhoto),
    consentReport: booleanValue(data.consentReport),
    dominantHand: stringValue(data.dominantHand, 80),
    dominantEye: stringValue(data.dominantEye, 80),
    dominantFoot: stringValue(data.dominantFoot, 80),
    knownTraits: stringValue(data.knownTraits),
    parentSignals: stringValue(data.parentSignals)
  };
}
