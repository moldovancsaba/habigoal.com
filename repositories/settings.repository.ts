import { getDatabase } from "@/lib/mongodb";
import type { HabigoalSettings } from "@/services/settings-service";

const collectionName = "settings";
const SETTINGS_ID = "global_settings";

export async function getGlobalSettings(): Promise<HabigoalSettings | null> {
  const db = await getDatabase();
  const settings = await db.collection(collectionName).findOne({ _id: SETTINGS_ID as any });
  if (!settings) return null;
  const { _id, ...rest } = settings;
  return rest as unknown as HabigoalSettings;
}

export async function updateGlobalSettings(settings: HabigoalSettings) {
  const db = await getDatabase();
  await db.collection(collectionName).updateOne(
    { _id: SETTINGS_ID as any },
    { $set: settings },
    { upsert: true }
  );
  return settings;
}
