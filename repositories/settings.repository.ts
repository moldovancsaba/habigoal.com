import { getDatabase } from "@/lib/mongodb";
import type { SurveySettings } from "@/services/settings-service";

const collectionName = "settings";
const SETTINGS_ID = "global_settings";

export async function getGlobalSettings(): Promise<SurveySettings | null> {
  const db = await getDatabase();
  const settings = await db.collection(collectionName).findOne({ _id: SETTINGS_ID as any });
  if (!settings) return null;
  const { _id, ...rest } = settings;
  return rest as unknown as SurveySettings;
}

export async function updateGlobalSettings(settings: SurveySettings) {
  const db = await getDatabase();
  await db.collection(collectionName).updateOne(
    { _id: SETTINGS_ID as any },
    { $set: settings },
    { upsert: true }
  );
  return settings;
}
