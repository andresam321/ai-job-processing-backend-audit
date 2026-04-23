import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { createJob, getJob, getJobsForUser } from '../services/jobService';
import { incrementUsage, getUsageForUser } from '../services/usageService';
import { isQuotaExceeded } from '../services/subscriptionService';

const router = Router();
router.use(authMiddleware);

// POST /jobs/create — submit a new text-to-speech job
router.post('/create', (req: Request, res: Response) => {
  const userId = req.userId!;
  const { text, idempotencyKey } = req.body as { text?: string; idempotencyKey?: string };

  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return res.status(400).json({ error: 'text is required and must be a non-empty string' });
  }

  if (isQuotaExceeded(userId, text.length)) {
    return res.status(429).json({ error: 'Monthly character quota exceeded' });
  }

  incrementUsage(userId, text.length);

  const job = createJob(userId, text, idempotencyKey);

  return res.status(201).json({ job });
});

// GET /jobs/:id — fetch a single job by ID
router.get('/:id', (req: Request, res: Response) => {
  const job = getJob(req.params.id);

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  if (job.userId !== req.userId) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  return res.status(200).json({ data: job });
});

// GET /jobs — list all jobs for the authenticated user
router.get('/', (req: Request, res: Response) => {
  const userId = req.userId!;
  const userJobs = getJobsForUser(userId);
  const usage = getUsageForUser(userId);

  return res.status(200).json({ result: userJobs, usage });
});

export default router;
