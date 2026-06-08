import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    // Admin Auth check here

    const db = await getDatabase();
    const collection = db.collection("queue_jobs");
    
    const { jobId } = await params;

    const result = await collection.updateOne(
      { jobId, status: "failed" },
      {
        $set: {
          status: "pending",
          attempts: 0,
          lastError: null,
          runAfter: new Date().toISOString(),
          lockedBy: null,
          lockedUntil: null,
          updatedAt: new Date().toISOString()
        }
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Job not found or not in failed state" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Job reset to pending" }, { status: 200 });
  } catch (error: unknown) {
    console.error("Error retrying job:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
