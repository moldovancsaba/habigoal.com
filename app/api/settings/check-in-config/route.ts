import { NextResponse } from "next/server";
import { getGlobalSettings, updateGlobalSettings } from "@/repositories/settings.repository";
import { jsonError, readJson, requireRole } from "@/lib/api";
import { DEFAULT_HABIGOAL_SETTINGS } from "@/services/settings-service";
import { defaultCheckInQuestions } from "@/lib/check-in-config";
import type { CheckInQuestionConfig } from "@/types/check-in-config";

export async function GET(request: Request) {
  const authError = await requireRole(request, ["admin", "trainer", "athlete", "performance_coach"]);
  if (authError) return authError;

  const settings = await getGlobalSettings();
  const config = settings?.checkInConfig ?? {
    questions: defaultCheckInQuestions(),
    allowDuplicateOverride: false,
    updatedAt: new Date().toISOString(),
  };
  return NextResponse.json(config);
}

export async function POST(request: Request) {
  const authError = await requireRole(request, ["admin"]);
  if (authError) return authError;

  const body = (await readJson(request)) as {
    questions?: CheckInQuestionConfig[];
    allowDuplicateOverride?: boolean;
  } | null;

  if (!body?.questions?.length) {
    return jsonError("questions required", 400, "VALIDATION_ERROR");
  }

  const current = (await getGlobalSettings()) ?? DEFAULT_HABIGOAL_SETTINGS;
  const next = {
    ...DEFAULT_HABIGOAL_SETTINGS,
    ...current,
    checkInConfig: {
      questions: body.questions,
      allowDuplicateOverride: Boolean(body.allowDuplicateOverride),
      updatedAt: new Date().toISOString(),
    },
  };
  await updateGlobalSettings(next);
  return NextResponse.json(next.checkInConfig);
}
