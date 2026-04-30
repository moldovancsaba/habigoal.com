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
  emailTemplates: {
    en: { subject: string; body: string };
    hu: { subject: string; body: string };
    ar: { subject: string; body: string };
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
  },
  emailTemplates: {
    en: {
      subject: "Welcome to KIDEX - You have been invited",
      body: "<h1>Welcome to KIDEX</h1><p>You have been invited to join the KIDEX Bio-Psycho-Social Sport Ecosystem.</p><p>You can now log in using your email address at:</p><a href=\"{{link}}\" style=\"padding: 12px 24px; background: #008080; color: white; text-decoration: none; border-radius: 6px; display: inline-block;\">Login to Dashboard</a><p>If the button doesn't work, copy and paste this link: {{link}}</p>"
    },
    hu: {
      subject: "Üdvözöljük a KIDEX-ben - Meghívót kapott",
      body: "<h1>Üdvözöljük a KIDEX-ben</h1><p>Meghívást kapott a KIDEX Bio-pszicho-szociális sport ökoszisztémába.</p><p>Mostantól bejelentkezhet az e-mail címével az alábbi linken:</p><a href=\"{{link}}\" style=\"padding: 12px 24px; background: #008080; color: white; text-decoration: none; border-radius: 6px; display: inline-block;\">Belépés a Vezérlőpultra</a><p>Ha a gomb nem működik, másolja be ezt a linket a böngészőjébe: {{link}}</p>"
    },
    ar: {
      subject: "مرحباً بك في كيديكس - لقد تم دعوتك",
      body: "<div dir=\"rtl\"><h1>مرحباً بك في كيديكس</h1><p>لقد تم دعوتك للانضمام إلى نظام كيديكس الرياضي الحيوي-النفسي-الاجتماعي.</p><p>يمكنك الآن تسجيل الدخول باستخدام بريدك الإلكتروني عبر الرابط التالي:</p><a href=\"{{link}}\" style=\"padding: 12px 24px; background: #008080; color: white; text-decoration: none; border-radius: 6px; display: inline-block;\">تسجيل الدخول إلى لوحة التحكم</a><p>إذا لم يعمل الزر، قم بنسخ ولصق هذا الرابط: {{link}}</p></div>"
    }
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
    },
    emailTemplates: {
      ...DEFAULT_KIDEX_SETTINGS.emailTemplates,
      ...(next.emailTemplates ?? {})
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
