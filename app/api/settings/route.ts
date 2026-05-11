import { NextResponse } from "next/server";
import { getGlobalSettings, updateGlobalSettings } from "@/repositories/settings.repository";
import { jsonError, readJson, requireRole } from "@/lib/api";
import { parseSettingsPayload } from "@/lib/validations";
import { DEFAULT_SURVEY_SETTINGS } from "@/services/settings-service";

export async function GET(request: Request) {
  const authError = await requireRole(request, ["admin", "trainer"]);
  if (authError) return authError;

  try {
    const settings = await getGlobalSettings();
    if (!settings) {
      return NextResponse.json(DEFAULT_SURVEY_SETTINGS);
    }
    return NextResponse.json({
      ...DEFAULT_SURVEY_SETTINGS,
      ...settings,
      company: {
        ...DEFAULT_SURVEY_SETTINGS.company,
        ...(settings.company ?? {})
      }
    });
  } catch (error) {
    return jsonError((error as Error).message);
  }
}

export async function POST(request: Request) {
  const authError = await requireRole(request, ["admin"]);
  if (authError) return authError;

  try {
    const body = parseSettingsPayload(await readJson(request));
    const settings = await updateGlobalSettings({
      ...DEFAULT_SURVEY_SETTINGS,
      ...body,
      standards: body.standards?.activeVersion && body.standards?.versions
        ? (body.standards as typeof DEFAULT_SURVEY_SETTINGS.standards)
        : DEFAULT_SURVEY_SETTINGS.standards
    });
    return NextResponse.json(settings);
  } catch (error) {
    return jsonError((error as Error).message);
  }
}
