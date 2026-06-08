import { getModelRegistry } from "@/lib/model-registry";
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ models: getModelRegistry() });
}
