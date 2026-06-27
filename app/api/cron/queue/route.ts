import { NextRequest, NextResponse } from "next/server";
import { env } from "@/config/env";
import { authorizeCronRequest } from "@/lib/cron-auth";
import { runQueueWorkerLoop } from "@/lib/queue-worker";

const MAX_JOBS_PER_RUN = 50;

// Scheduled queue drain. Invoked by Vercel Cron (see vercel.json) or any external
// scheduler that sends `Authorization: Bearer <CRON_SECRET>`. Idempotent and safe
// under overlap: runQueueWorkerLoop claims jobs atomically (queue.repository), so
// concurrent ticks never double-process. Returns 503 when CRON_SECRET is unset so
// the endpoint is never an open trigger.
export async function GET(request: NextRequest) {
  if (!env.cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
  }
  if (!authorizeCronRequest(request.headers.get("authorization"), env.cronSecret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = Date.now();
  const processed = await runQueueWorkerLoop(MAX_JOBS_PER_RUN);
  return NextResponse.json({ ok: true, processed, durationMs: Date.now() - startedAt });
}
