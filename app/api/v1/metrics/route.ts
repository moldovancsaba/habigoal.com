import { NextResponse } from "next/server";
import { env } from "@/config/env";
import { findByAthleteAndDateRange } from "@/repositories/canonical-metric.repository";
import type { CanonicalMetricKey } from "@/types/canonical-metric";

export async function GET(request: Request) {
  const authHeader = request.headers.get("Authorization");
  const expectedApiKey = env.trainersIngestApiKey;
  if (!expectedApiKey) {
    return NextResponse.json({ error: "Metrics API key is not configured." }, { status: 503 });
  }
  if (authHeader !== `Bearer ${expectedApiKey}`) {
    return NextResponse.json({ error: "Unauthorized. Invalid API key." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const athleteId = searchParams.get("athleteId")?.trim() ?? "";
  const from = searchParams.get("from")?.trim() ?? "";
  const to = searchParams.get("to")?.trim() ?? from;
  const keys = searchParams.get("keys")?.split(",").map((key) => key.trim()).filter(Boolean) as CanonicalMetricKey[] | undefined;

  if (!athleteId) return NextResponse.json({ error: "athleteId is required" }, { status: 400 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return NextResponse.json({ error: "from and to must use YYYY-MM-DD" }, { status: 400 });
  }

  const data = await findByAthleteAndDateRange(athleteId, from, to, keys);
  return NextResponse.json({ data });
}
