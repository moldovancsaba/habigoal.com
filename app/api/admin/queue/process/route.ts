import { NextRequest, NextResponse } from "next/server";
import { runQueueWorkerLoop } from "@/lib/queue-worker";
import { requireRole } from "@/lib/api";

export async function POST(request: NextRequest) {
  const authError = await requireRole(request, ["admin"]);
  if (authError) return authError;

  const processed = await runQueueWorkerLoop(25);
  return NextResponse.json({ processed });
}
