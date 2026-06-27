import { NextRequest, NextResponse } from "next/server";
import { getJobsByStatus } from "@/repositories/queue.repository";
import { JobStatus } from "@/types/queue";
import { requireRole } from "@/lib/api";

export async function GET(request: NextRequest) {
  const authError = await requireRole(request, ["admin"]);
  if (authError) return authError;

  try {
    const searchParams = request.nextUrl.searchParams;
    const status = (searchParams.get("status") || "pending") as JobStatus;

    const jobs = await getJobsByStatus(status, 100);

    return NextResponse.json({ data: jobs }, { status: 200 });
  } catch (error: unknown) {
    console.error("Error fetching queue jobs:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
