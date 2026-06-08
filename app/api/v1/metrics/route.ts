import { NextResponse } from "next/server";

export async function GET(request: Request) {
  // Validate API Key from header
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ak_")) {
    return NextResponse.json({ error: "Unauthorized. Invalid API Key." }, { status: 401 });
  }

  console.log("Serving open API metrics export request...");

  // Mock returning canonical metrics for data warehouse ingestion
  const mockMetrics = [
    {
      metricId: "mock:2026-06-08:garmin:resting_heart_rate_bpm",
      athleteId: "mock_athlete",
      date: "2026-06-08",
      canonicalKey: "resting_heart_rate_bpm",
      value: 52,
      unit: "bpm"
    }
  ];

  return NextResponse.json({ data: mockMetrics });
}
