import { NextResponse } from "next/server";
import { getGlobalSettings, updateGlobalSettings } from "@/repositories/settings.repository";
import { jsonError, readJson, requireRole } from "@/lib/api";
import { parseSettingsPayload } from "@/lib/validations";

export async function GET() {
  try {
    const settings = await getGlobalSettings();
    if (!settings) {
      return NextResponse.json({
        conductors: ["Dr. Kovács Anna", "Szabó Márton", "Német László"],
        observers: ["Papp Imre", "Varga Edit", "Kiss Zoltán"],
        locations: ["Budapest Sportcsarnok", "Debrecen Training Center", "Online"]
      });
    }
    return NextResponse.json(settings);
  } catch (error) {
    return jsonError((error as Error).message);
  }
}

export async function POST(request: Request) {
  const authError = requireRole(request, ["admin"]);
  if (authError) return authError;

  try {
    const body = parseSettingsPayload(await readJson(request));
    const settings = await updateGlobalSettings(body);
    return NextResponse.json(settings);
  } catch (error) {
    return jsonError((error as Error).message);
  }
}
