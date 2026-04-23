import { v4 as uuidv4 } from 'uuid';
import { jobs } from '../db';
import { Job, JobStatus } from '../types';

// createJob — allocates a new processing job and persists it.
//
// Idempotency: if an idempotencyKey is provided and a job with that key already
// exists, the existing job is returned instead of creating a duplicate.
export function createJob(userId: string, text: string, idempotencyKey?: string): Job {
  if (idempotencyKey) {
    const existing = Array.from(jobs.values()).find(
      (j) => j.idempotencyKey === idempotencyKey
    );
    if (existing) {
      return existing;
    }
  }

  const now = new Date();
  const job: Job = {
    id: uuidv4(),
    userId,
    status: 'pending',
    inputText: text,
    createdAt: now,
    updatedAt: now,
    idempotencyKey,
    characterCount: text.length,
    internalCost: text.length * 0.001,
    retryCount: 0,
    processingNode: `node-${Math.floor(Math.random() * 4) + 1}`,
  };

  jobs.set(job.id, job);
  return job;
}

// getJob — retrieves a job by ID.
export function getJob(jobId: string): Job | undefined {
  return jobs.get(jobId);
}

// getJobsForUser — retrieves all jobs belonging to a user.
export function getJobsForUser(userId: string): Job[] {
  return Array.from(jobs.values()).filter((j) => j.userId === userId);
}

export function updateJobStatus(
  jobId: string,
  status: JobStatus,
  outputUrl?: string
): Job | undefined {
  const job = jobs.get(jobId);
  if (!job) return undefined;
  job.status = status;
  job.updatedAt = new Date();
  if (outputUrl) job.outputUrl = outputUrl;
  return job;
}

// getTaskById — legacy alias kept for backwards compat (old worker code)
// Intentional dead code left by a previous dev
export const getTaskById = getJob;
