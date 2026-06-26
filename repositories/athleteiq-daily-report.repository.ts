import { getDatabase } from "@/lib/mongodb";
import { toJsonId } from "@/lib/utils";
import type { DailyReportSnapshot, DailyReportType } from "@/types/athleteiq-daily-report";

const collectionName = "athleteiq_daily_reports";
type DailyReportDocument = Omit<DailyReportSnapshot, "id"> & { id: string };

function normalizeReport(record: Record<string, unknown>) {
  return toJsonId(record) as unknown as DailyReportSnapshot;
}

export async function insertDailyReportSnapshot(snapshot: DailyReportSnapshot) {
  const db = await getDatabase();
  await db.collection<DailyReportDocument>(collectionName).insertOne(snapshot);
  return snapshot;
}

export async function getDailyReportById(id: string) {
  const db = await getDatabase();
  const record = await db.collection<DailyReportDocument>(collectionName).findOne({ id });
  return record ? normalizeReport(record as unknown as Record<string, unknown>) : null;
}

export async function getLatestDailyReport(input: {
  athleteId?: string;
  teamId?: string;
  localDate: string;
  reportType: DailyReportType;
}) {
  const db = await getDatabase();
  const record = await db.collection<DailyReportDocument>(collectionName)
    .find({
      reportType: input.reportType,
      localDate: input.localDate,
      ...(input.athleteId ? { athleteId: input.athleteId } : {}),
      ...(input.teamId ? { teamId: input.teamId } : {})
    })
    .sort({ generatedAt: -1 })
    .limit(1)
    .next();
  return record ? normalizeReport(record as unknown as Record<string, unknown>) : null;
}
