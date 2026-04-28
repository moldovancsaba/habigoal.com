import { NextResponse } from "next/server";
import { getGlobalSettings, updateGlobalSettings } from "@/repositories/settings.repository";

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
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const settings = await updateGlobalSettings(body);
    return NextResponse.json(settings);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
