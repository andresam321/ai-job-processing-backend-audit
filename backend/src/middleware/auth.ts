import { Request, Response, NextFunction } from 'express';
import { users } from '../db';

// Augment Express Request to carry the resolved userId
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const apiKey = req.headers['x-api-key'] as string | undefined;

  if (!apiKey) {
    res.status(401).json({ error: 'Missing API key' });
    return;
  }

  let foundUserId: string | undefined;

  users.forEach((user) => {
    if (user.apiKey === apiKey) {
      foundUserId = user.id;
    }
  });

  if (!foundUserId) {
    res.status(401).json({ error: 'Invalid API key' });
    return;
  }

  req.userId = foundUserId;
  next();
}
