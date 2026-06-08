import { getDatabase } from "@/lib/mongodb";
import { QueueJob, JobStatus } from "../types/queue";

const COLLECTION_NAME = "queue_jobs";

export async function enqueueJob(job: Omit<QueueJob, "status" | "attempts" | "createdAt" | "updatedAt">): Promise<void> {
  const db = await getDatabase();
  const collection = db.collection(COLLECTION_NAME);

  const now = new Date().toISOString();
  const fullJob: QueueJob = {
    ...job,
    status: "pending",
    attempts: 0,
    createdAt: now,
    updatedAt: now,
  };

  await collection.insertOne(fullJob);
}

export async function claimNextPendingJob(workerId: string): Promise<QueueJob | null> {
  const db = await getDatabase();
  const collection = db.collection<QueueJob>(COLLECTION_NAME);

  const now = new Date().toISOString();
  const lockTimeout = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 min lock

  // Find a job that is either pending, or stuck in processing (lock expired)
  const query: any = {
    runAfter: { $lte: now },
    $or: [
      { status: "pending" },
      { status: "processing", lockedUntil: { $lt: now } }
    ]
  };

  const update: any = {
    $set: {
      status: "processing",
      lockedBy: workerId,
      lockedUntil: lockTimeout,
      updatedAt: now
    },
    $inc: { attempts: 1 }
  };

  // Sort by priority (1 is highest), then oldest createdAt
  const result = await collection.findOneAndUpdate(
    query,
    update,
    { sort: { priority: 1, createdAt: 1 }, returnDocument: "after" }
  );

  return result as unknown as QueueJob | null;
}

export async function completeJob(jobId: string): Promise<void> {
  const db = await getDatabase();
  const collection = db.collection(COLLECTION_NAME);

  await collection.updateOne(
    { jobId },
    {
      $set: {
        status: "completed",
        lockedBy: undefined,
        lockedUntil: undefined,
        updatedAt: new Date().toISOString()
      }
    }
  );
}

export async function failJob(jobId: string, errorMsg: string, maxAttempts: number): Promise<void> {
  const db = await getDatabase();
  const collection = db.collection<QueueJob>(COLLECTION_NAME);
  
  const job = await collection.findOne({ jobId });
  if (!job) return;

  const now = new Date().toISOString();
  const isFinalFailure = job.attempts >= maxAttempts;
  
  const status: JobStatus = isFinalFailure ? "failed" : "pending";
  
  // Exponential backoff: 2^attempts minutes
  const backoffMs = Math.pow(2, job.attempts) * 60 * 1000;
  const runAfter = new Date(Date.now() + backoffMs).toISOString();

  await collection.updateOne(
    { jobId },
    {
      $set: {
        status,
        lastError: errorMsg,
        runAfter: isFinalFailure ? job.runAfter : runAfter,
        lockedBy: undefined,
        lockedUntil: undefined,
        updatedAt: now
      }
    }
  );
}

export async function getJobsByStatus(status: JobStatus, limit = 50): Promise<QueueJob[]> {
  const db = await getDatabase();
  const collection = db.collection<QueueJob>(COLLECTION_NAME);
  return await collection.find({ status }).sort({ updatedAt: -1 }).limit(limit).toArray();
}
