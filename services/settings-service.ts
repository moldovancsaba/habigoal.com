export interface SurveySettings {
  conductors: string[];
  observers: string[];
  locations: string[];
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

const STORAGE_KEY = "survey-settings-local";
const LEGACY_STORAGE_KEY = "kidex-settings-local";
export const DEFAULT_SURVEY_SETTINGS: SurveySettings = {
  conductors: [],
  observers: [],
  locations: [],
  company: {
    name: "Survey",
    ico: "57474869",
    registered: "19.02.2026",
    legalForm: "Limited Liability Company",
    address: "Želiarsky svah 29, Štúrovo, Slovakia 943 01",
    shareCapital: "EUR 5 000",
    vatNo: "SK2122770606",
    website: "https://survey.app"
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

function normalizeSettings(raw: Partial<SurveySettings> | null | undefined): SurveySettings {
  const next = raw ?? {};
  return {
    ...DEFAULT_SURVEY_SETTINGS,
    conductors: next.conductors ?? DEFAULT_SURVEY_SETTINGS.conductors,
    observers: next.observers ?? DEFAULT_SURVEY_SETTINGS.observers,
    locations: next.locations ?? DEFAULT_SURVEY_SETTINGS.locations,
    company: {
      ...DEFAULT_SURVEY_SETTINGS.company,
      ...(next.company ?? {})
    },
    standards: {
      ...DEFAULT_SURVEY_SETTINGS.standards,
      ...(next.standards ?? {})
    }
  };
}

export async function getSettings(): Promise<SurveySettings> {
  const response = await fetch("/api/settings").catch(() => null);
  if (response?.ok) {
    return normalizeSettings((await response.json()) as Partial<SurveySettings>);
  }
  
  // Fallback to local storage or empty settings
  const local = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY);
  if (local) return normalizeSettings(JSON.parse(local) as Partial<SurveySettings>);
  
  return DEFAULT_SURVEY_SETTINGS;
}

export async function saveSettings(settings: SurveySettings): Promise<boolean> {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(settings));
  
  const response = await fetch("/api/settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings)
  }).catch(() => null);
  
  return !!response?.ok;
}
