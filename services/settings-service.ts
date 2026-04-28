export interface KidexSettings {
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
}

const STORAGE_KEY = "kidex-settings-local";
export const DEFAULT_KIDEX_SETTINGS: KidexSettings = {
  conductors: [],
  observers: [],
  locations: [],
  company: {
    name: "KIDEX s.r.o.",
    ico: "57474869",
    registered: "19.02.2026",
    legalForm: "Limited Liability Company",
    address: "Želiarsky svah 29, Štúrovo, Slovakia 943 01",
    shareCapital: "EUR 5 000",
    vatNo: "SK2122770606",
    website: "https://kidex.eu"
  }
};

function normalizeSettings(raw: Partial<KidexSettings> | null | undefined): KidexSettings {
  const next = raw ?? {};
  return {
    ...DEFAULT_KIDEX_SETTINGS,
    conductors: next.conductors ?? DEFAULT_KIDEX_SETTINGS.conductors,
    observers: next.observers ?? DEFAULT_KIDEX_SETTINGS.observers,
    locations: next.locations ?? DEFAULT_KIDEX_SETTINGS.locations,
    company: {
      ...DEFAULT_KIDEX_SETTINGS.company,
      ...(next.company ?? {})
    }
  };
}

export async function getSettings(): Promise<KidexSettings> {
  const response = await fetch("/api/settings").catch(() => null);
  if (response?.ok) {
    return normalizeSettings((await response.json()) as Partial<KidexSettings>);
  }
  
  // Fallback to local storage or empty settings
  const local = localStorage.getItem(STORAGE_KEY);
  if (local) return normalizeSettings(JSON.parse(local) as Partial<KidexSettings>);
  
  return DEFAULT_KIDEX_SETTINGS;
}

export async function saveSettings(settings: KidexSettings): Promise<boolean> {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  
  const response = await fetch("/api/settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings)
  }).catch(() => null);
  
  return !!response?.ok;
}
