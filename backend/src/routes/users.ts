import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { users } from '../db';
import { getMonthlyUsage } from '../services/usageService';
import { getUserPlan } from '../services/subscriptionService';

const router = Router();
router.use(authMiddleware);

router.get('/me', (req: Request, res: Response) => {
  const user = users.get(req.userId!);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const plan = getUserPlan(req.userId!);
  const usage = getMonthlyUsage(req.userId!);

  return res.status(200).json({
    data: {
      id: user.id,
      email: user.email,
      plan: plan?.name ?? 'unknown',
      usage,
      quota: plan?.monthlyCharacterQuota ?? 0,
    },
  });
});

export default router;
