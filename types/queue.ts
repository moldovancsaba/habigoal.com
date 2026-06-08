export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export type JobType = 
  | 'sync_wearable'
  | 'generate_ai_insight'
  | 'recalculate_twin'
  | 'export_report';

export interface QueueJob {
  _id?: any;
  jobId: string;
  type: JobType;
  status: JobStatus;
  priority: number;             // 1 (high) to 100 (low)
  payload: Record<string, any>;
  attempts: number;
  maxAttempts: number;
  lastError?: string;
  runAfter: string;             // ISO string for delayed execution
  lockedUntil?: string;         // ISO string for processing lock
  lockedBy?: string;            // Worker ID
  createdAt: string;
  updatedAt: string;
}
