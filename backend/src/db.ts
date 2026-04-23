import { Job, User, SubscriptionPlan, UsageRecord } from './types';

// ---------------------------------------------------------------------------
// In-memory storage
// NOTE: these Maps are exported directly — callers receive live references
// ---------------------------------------------------------------------------

export const jobs = new Map<string, Job>();
export const users = new Map<string, User>();
export const usageRecords = new Map<string, UsageRecord>();

export const plans = new Map<string, SubscriptionPlan>([
  [
    'free',
    {
      id: 'free',
      name: 'Free',
      monthlyCharacterQuota: 10000,
      pricePerCharacter: 0,
    },
  ],
  [
    'pro',
    {
      id: 'pro',
      name: 'Pro',
      monthlyCharacterQuota: 100000,
      pricePerCharacter: 0.001,
    },
  ],
  [
    'enterprise',
    {
      id: 'enterprise',
      name: 'Enterprise',
      monthlyCharacterQuota: 1000000,
      pricePerCharacter: 0.0005,
    },
  ],
]);

export function seedDatabase(): void {
  users.set('user-1', {
    id: 'user-1',
    email: 'alice@example.com',
    apiKey: 'key-alice-123',
    subscriptionPlanId: 'pro',
    createdAt: new Date('2024-01-01'),
  });

  users.set('user-2', {
    id: 'user-2',
    email: 'bob@example.com',
    apiKey: 'key-bob-456',
    subscriptionPlanId: 'free',
    createdAt: new Date('2024-01-01'),
  });
}

// Run on import so the server has seed data immediately
seedDatabase();
