import { NextRequest, NextResponse } from "next/server";
import { getJobsByStatus } from "@/repositories/queue.repository";
import { JobStatus } from "@/types/queue";

export async function GET(request: NextRequest) {
  try {
    // Admin Auth check here
    
    const searchParams = request.nextUrl.searchParams;
    const status = (searchParams.get("status") || "pending") as JobStatus;

    const jobs = await getJobsByStatus(status, 100);

    return NextResponse.json({ data: jobs }, { status: 200 });
  } catch (error: unknown) {
    console.error("Error fetching queue jobs:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
