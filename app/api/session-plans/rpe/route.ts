import { NextResponse } from "next/server";
import { SessionRpeResult } from "../../../../types/training-plan";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sessionId, athleteId, rpeScore, durationMinutes } = body;

    if (!sessionId || !athleteId || typeof rpeScore !== 'number') {
      return NextResponse.json({ error: "Invalid RPE payload" }, { status: 400 });
    }

    console.log(`Recording RPE ${rpeScore} for athlete ${athleteId} in session ${sessionId}`);

    const result: SessionRpeResult = {
      sessionId,
      athleteId,
      rpeScore,
      durationMinutes: durationMinutes || 60,
      completedLoadPoints: rpeScore * (durationMinutes || 60),
      recordedAt: new Date().toISOString()
    };

    // Store in DB...
    
    return NextResponse.json({ success: true, result });
  } catch {
    return NextResponse.json({ error: "Failed to record RPE" }, { status: 500 });
  }
}
