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
  
  // Fallback to local storage or defaults
  const local = localStorage.getItem(STORAGE_KEY);
  if (local) return JSON.parse(local);
  
  return {
    conductors: ["Dr. Kovács Anna", "Szabó Márton", "Német László"],
    observers: ["Papp Imre", "Varga Edit", "Kiss Zoltán"],
    locations: ["Budapest Sportcsarnok", "Debrecen Training Center", "Online"]
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
