import { claimNextPendingJob, completeJob, failJob } from "@/repositories/queue.repository";
import { processCheckInToTwin } from "@/services/twin-pipeline.service";
import { exportAthleteData } from "@/services/privacy.service";
import { ingestForConnection } from "@/lib/wearable-ingestion";
import { findConnectionById } from "@/repositories/device-connection.repository";
import { GarminConnector } from "@/services/connectors/garmin.connector";
import { WhoopConnector } from "@/services/connectors/whoop.connector";
import { ensurePlatformInitialised } from "@/lib/platform-init";
import type { QueueJob } from "@/types/queue";

const WORKER_ID = `worker-${process.pid}`;

async function handleJob(job: QueueJob): Promise<void> {
  ensurePlatformInitialised();

  switch (job.type) {
    case "generate_ai_insight":
      // Twin already updated in check-in pipeline; no-op placeholder for cluster expansion
      break;
    case "recalculate_twin":
      if (job.payload.assessment) {
        await processCheckInToTwin(job.payload.assessment, job.payload.organisationId ?? "default");
      }
      break;
    case "export_report":
      if (job.payload.athleteId) {
        await exportAthleteData(job.payload.athleteId);
      }
      break;
    case "sync_wearable": {
      const connection = await findConnectionById(job.payload.connectionId);
      if (!connection) break;
      const connector = connection.source === "garmin" ? new GarminConnector() : new WhoopConnector();
      const to = new Date().toISOString().split("T")[0];
      const from = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
      await ingestForConnection(connector, connection, from, to);
      break;
    }
    default:
      console.warn(`Unknown job type: ${job.type}`);
  }
}

export async function processNextQueueJob(): Promise<boolean> {
  const job = await claimNextPendingJob(WORKER_ID);
  if (!job) return false;

  try {
    await handleJob(job);
    await completeJob(job.jobId);
  } catch (error) {
    await failJob(job.jobId, error instanceof Error ? error.message : "Unknown error", job.maxAttempts ?? 3);
  }
  return true;
}

export async function runQueueWorkerLoop(maxJobs = 10): Promise<number> {
  let processed = 0;
  for (let i = 0; i < maxJobs; i++) {
    const didWork = await processNextQueueJob();
    if (!didWork) break;
    processed++;
  }
  return processed;
}
