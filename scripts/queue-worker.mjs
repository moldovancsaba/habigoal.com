import { config } from "dotenv";
config();

import { MongoClient } from "mongodb";
import crypto from "crypto";

// We need to implement a standalone worker because we can't easily import 
// Next.js TS files into a raw Node script without a build step or ts-node.
// For simplicity in this demo script, we interact with MongoDB directly.

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("MONGODB_URI is required");

const dbName = process.env.MONGODB_DB || "habigoal";
const client = new MongoClient(uri);

const WORKER_ID = `worker-${crypto.randomUUID()}`;
const COLLECTION_NAME = "queue_jobs";
const POLL_INTERVAL_MS = 5000;

async function claimNextPendingJob(db) {
  const collection = db.collection(COLLECTION_NAME);
  const now = new Date().toISOString();
  const lockTimeout = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  const query = {
    runAfter: { $lte: now },
    $or: [
      { status: "pending" },
      { status: "processing", lockedUntil: { $lt: now } }
    ]
  };

  const update = {
    $set: {
      status: "processing",
      lockedBy: WORKER_ID,
      lockedUntil: lockTimeout,
      updatedAt: now
    },
    $inc: { attempts: 1 }
  };

  const result = await collection.findOneAndUpdate(
    query,
    update,
    { sort: { priority: 1, createdAt: 1 }, returnDocument: "after" }
  );

  return result;
}

async function completeJob(db, jobId) {
  await db.collection(COLLECTION_NAME).updateOne(
    { jobId },
    {
      $set: {
        status: "completed",
        lockedBy: null,
        lockedUntil: null,
        updatedAt: new Date().toISOString()
      }
    }
  );
}

async function failJob(db, job, errorMsg) {
  const now = new Date().toISOString();
  const isFinalFailure = job.attempts >= job.maxAttempts;
  const status = isFinalFailure ? "failed" : "pending";
  
  const backoffMs = Math.pow(2, job.attempts) * 60 * 1000;
  const runAfter = new Date(Date.now() + backoffMs).toISOString();

  await db.collection(COLLECTION_NAME).updateOne(
    { jobId: job.jobId },
    {
      $set: {
        status,
        lastError: errorMsg,
        runAfter: isFinalFailure ? job.runAfter : runAfter,
        lockedBy: null,
        lockedUntil: null,
        updatedAt: now
      }
    }
  );
}

async function processJob(db, job) {
  console.log(`[${WORKER_ID}] Processing job ${job.jobId} of type ${job.type} (attempt ${job.attempts})`);
  
  try {
    // Basic dispatcher
    switch (job.type) {
      case "sync_wearable":
        // Call ingestion logic
        // await ingestForConnection(...)
        console.log(`Simulating wearable sync for connection ${job.payload.connectionId}`);
        await new Promise(r => setTimeout(r, 1000));
        break;
      case "generate_ai_insight":
        console.log(`Simulating AI insight for athlete ${job.payload.athleteId}`);
        await new Promise(r => setTimeout(r, 500));
        break;
      default:
        throw new Error(`Unknown job type: ${job.type}`);
    }

    await completeJob(db, job.jobId);
    console.log(`[${WORKER_ID}] Completed job ${job.jobId}`);
  } catch (error) {
    console.error(`[${WORKER_ID}] Failed job ${job.jobId}:`, error.message);
    await failJob(db, job, error.message);
  }
}

async function runWorker() {
  console.log(`[${WORKER_ID}] Starting queue worker connecting to ${uri}`);
  await client.connect();
  const db = client.db(dbName);

  console.log(`[${WORKER_ID}] Waiting for jobs...`);
  
  while (true) {
    try {
      const job = await claimNextPendingJob(db);
      
      if (job) {
        await processJob(db, job);
      } else {
        // No jobs, sleep before polling again
        await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
      }
    } catch (err) {
      console.error(`[${WORKER_ID}] Queue polling error:`, err);
      await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
    }
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log(`\n[${WORKER_ID}] Shutting down gracefully...`);
  await client.close();
  process.exit(0);
});

runWorker().catch(console.error);
