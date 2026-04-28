export interface KidexSettings {
  conductors: string[];
  observers: string[];
  locations: string[];
}

const STORAGE_KEY = "kidex-settings-local";

export async function getSettings(): Promise<KidexSettings> {
  const response = await fetch("/api/settings").catch(() => null);
  if (response?.ok) {
    return await response.json();
  }
  
  // Fallback to local storage or empty settings
  const local = localStorage.getItem(STORAGE_KEY);
  if (local) return JSON.parse(local);
  
  return {
    conductors: [],
    observers: [],
    locations: []
  };
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
