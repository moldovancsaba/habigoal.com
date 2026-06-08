import { NextRequest, NextResponse } from "next/server";
import { findTwinByAthleteId } from "@/repositories/athlete-twin.repository";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: athleteId } = await params;

    const twin = await findTwinByAthleteId(athleteId);
    
    if (!twin) {
      return NextResponse.json({ data: null, message: "Twin not yet generated" }, { status: 200 });
    }

    return NextResponse.json({ data: twin }, { status: 200 });
  } catch (error: unknown) {
    console.error("Error fetching athlete twin:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
