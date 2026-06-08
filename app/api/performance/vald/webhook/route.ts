import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log(`Received VALD Hub webhook:`, body);

    // Mock processing for VALD force plate and NordBord data
    const { athleteId, testType, metrics } = body;
    
    if (testType === 'Countermovement Jump') {
      console.log(`Ingesting CMJ for ${athleteId}: Peak Force ${metrics.peakForce} N`);
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Webhook ingestion failed" }, { status: 500 });
  }
}
