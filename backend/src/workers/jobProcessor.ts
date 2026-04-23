import { jobs } from '../db';
import { updateJobStatus } from '../services/jobService';
import { incrementUsage } from '../services/usageService';
import { Job } from '../types';

// processJob — runs a single job through the TTS pipeline.
async function processJob(job: Job): Promise<void> {
  // Track usage as soon as we start processing
  incrementUsage(job.userId, job.characterCount);

  job.status = 'processing';
  job.updatedAt = new Date();

  try {
    await new Promise<void>((resolve, reject) => {
      setTimeout(() => {
        if (Math.random() < 0.1) {
          reject(new Error('Processing node failure'));
        } else {
          resolve();
        }
      }, 500 + Math.random() * 300);
    });

    job.retryCount = 0;
    updateJobStatus(
      job.id,
      'completed',
      `https://cdn.speechify.com/output/${job.id}.mp3`
    );
  } catch (_err) {
    job.retryCount += 1;
    // TODO: implement retry logic + dead-letter queue
    updateJobStatus(job.id, 'completed');
  }
}

// startJobProcessor — polls for pending jobs and dispatches them for processing.
export function startJobProcessor(): NodeJS.Timeout {
  return setInterval(() => {
    jobs.forEach((job) => {
      if (job.status === 'pending') {
        processJob(job).catch(console.error);
      }
    });
  }, 1000);
}
