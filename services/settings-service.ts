export interface HabigoalSettings {
  conductors: string[];
  observers: string[];
  locations: string[];
  alerting: {
    dailyDigestEnabled: boolean;
    missedCheckInCutoffHour: number;
    watchReadinessThreshold: number;
    supportReadinessThreshold: number;
  };
  checkInConfig?: {
    questions: import("@/types/check-in-config").CheckInQuestionConfig[];
    allowDuplicateOverride: boolean;
    updatedAt: string;
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
    versions: Record<string, {
      meta?: {
        createdBy?: string;
        createdAt?: string;
        notes?: string;
        status?: "draft" | "published";
      };
      "4-6": { movement: { target: number; min: number }; social: { target: number; min: number }; mental: { target: number; min: number }; ski: { target: number; min: number } };
      "7-9": { movement: { target: number; min: number }; social: { target: number; min: number }; mental: { target: number; min: number }; ski: { target: number; min: number } };
      "10-12": { movement: { target: number; min: number }; social: { target: number; min: number }; mental: { target: number; min: number }; ski: { target: number; min: number } };
    }>;
  };
}

const STORAGE_KEY = "habigoal-settings-local";
export const DEFAULT_HABIGOAL_SETTINGS: HabigoalSettings = {
  conductors: [],
  observers: [],
  locations: [],
  alerting: {
    dailyDigestEnabled: true,
    missedCheckInCutoffHour: 12,
    watchReadinessThreshold: 4,
    supportReadinessThreshold: 3
  },
  company: {
    name: "Habigoal",
    ico: "57474869",
    registered: "19.02.2026",
    legalForm: "Limited Liability Company",
    address: "Želiarsky svah 29, Štúrovo, Slovakia 943 01",
    shareCapital: "EUR 5 000",
    vatNo: "SK2122770606",
    website: "https://habigoal.com"
  },
  standards: {
    activeVersion: "v1",
    versions: {
      v1: {
        meta: { createdAt: new Date().toISOString(), status: "published", notes: "Initial baseline standards." },
        "4-6": {
          movement: { target: 4.5, min: 3.0 },
          social: { target: 4.0, min: 2.5 },
          mental: { target: 3.5, min: 2.0 },
          ski: { target: 4.0, min: 2.5 }
        },
        "7-9": {
          movement: { target: 5.0, min: 3.5 },
          social: { target: 4.5, min: 3.0 },
          mental: { target: 4.0, min: 2.5 },
          ski: { target: 4.5, min: 3.0 }
        },
        "10-12": {
          movement: { target: 5.5, min: 4.0 },
          social: { target: 5.0, min: 3.5 },
          mental: { target: 4.5, min: 3.0 },
          ski: { target: 5.0, min: 3.5 }
        }
      }
    }
  }
};

function normalizeSettings(raw: Partial<HabigoalSettings> | null | undefined): HabigoalSettings {
  const next = raw ?? {};
  return {
    ...DEFAULT_HABIGOAL_SETTINGS,
    conductors: next.conductors ?? DEFAULT_HABIGOAL_SETTINGS.conductors,
    observers: next.observers ?? DEFAULT_HABIGOAL_SETTINGS.observers,
    locations: next.locations ?? DEFAULT_HABIGOAL_SETTINGS.locations,
    alerting: {
      ...DEFAULT_HABIGOAL_SETTINGS.alerting,
      ...(next.alerting ?? {})
    },
    company: {
      ...DEFAULT_HABIGOAL_SETTINGS.company,
      ...(next.company ?? {})
    },
    standards: {
      ...DEFAULT_HABIGOAL_SETTINGS.standards,
      ...(next.standards ?? {})
    }
  };
}

export async function getSettings(): Promise<HabigoalSettings> {
  const response = await fetch("/api/settings").catch(() => null);
  if (response?.ok) {
    return normalizeSettings((await response.json()) as Partial<HabigoalSettings>);
  }
  
  const local = localStorage.getItem(STORAGE_KEY);
  if (local) return normalizeSettings(JSON.parse(local) as Partial<HabigoalSettings>);
  
  return DEFAULT_HABIGOAL_SETTINGS;
}

export async function saveSettings(settings: HabigoalSettings): Promise<boolean> {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  
  const response = await fetch("/api/settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings)
  }).catch(() => null);
  
  return !!response?.ok;
}
