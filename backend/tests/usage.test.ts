import { describe, it, expect, beforeEach } from 'vitest';
import { jobs, users, usageRecords, seedDatabase } from '../src/db';
import {
  getUsageForUser,
  getMonthlyUsage,
  incrementUsage,
  getCurrentMonth,
} from '../src/services/usageService';
import { isQuotaExceeded } from '../src/services/subscriptionService';
import { Job } from '../src/types';

function makeCompletedJob(overrides: Partial<Job> = {}): Job {
  return {
    id: 'job-default',
    userId: 'user-1',
    status: 'completed',
    inputText: 'test input',
    characterCount: 100,
    createdAt: new Date(),
    updatedAt: new Date(),
    internalCost: 0.1,
    retryCount: 0,
    processingNode: 'node-1',
    ...overrides,
  };
}

beforeEach(() => {
  jobs.clear();
  usageRecords.clear();
  users.clear();
  seedDatabase();
});

// ─── Usage Calculation ────────────────────────────────────────────────────────

describe('getUsageForUser', () => {
  // PASSES — but HIDES BUG-9.
  // This test only works correctly because only user-1 jobs exist in the DB.
  // getUsageForUser has no userId filter — it sums ALL users' completed chars.
  // If user-2 jobs were also present, this would return the wrong (inflated) total.
  // A passing test should not be trusted as proof of correctness here.
  it('returns total character count of completed jobs', () => {
    jobs.set('j1', makeCompletedJob({ id: 'j1', characterCount: 100 }));
    jobs.set('j2', makeCompletedJob({ id: 'j2', characterCount: 250 }));
    jobs.set('j3', makeCompletedJob({ id: 'j3', characterCount: 50, status: 'pending' }));

    const usage = getUsageForUser('user-1');
    // PASSES only because no other users' jobs are present in this isolated test
    expect(usage).toBe(350);
  });

  // ✗ FAILS — BUG-9 exposed: when multiple users have jobs,
  // getUsageForUser counts everyone's completed chars for every user.
  it('does not count other users completed jobs', () => {
    jobs.set('alice-job', makeCompletedJob({ id: 'alice-job', userId: 'user-1', characterCount: 200 }));
    jobs.set('bob-job',   makeCompletedJob({ id: 'bob-job',   userId: 'user-2', characterCount: 500 }));

    const aliceUsage = getUsageForUser('user-1');
    // FAILS: returns 700 (alice + bob) instead of 200
    expect(aliceUsage).toBe(200);
  });
});

// ─── Usage Tracking ───────────────────────────────────────────────────────────

describe('incrementUsage', () => {
  it('adds to the monthly usage record', () => {
    incrementUsage('user-1', 300);
    expect(getMonthlyUsage('user-1')).toBe(300);

    incrementUsage('user-1', 200);
    expect(getMonthlyUsage('user-1')).toBe(500);
  });
});

// ─── Quota Enforcement ────────────────────────────────────────────────────────

describe('isQuotaExceeded', () => {
  // MISLEADING PASS — this test appears to validate quota enforcement
  // but only exercises the case where usage is already OVER quota.
  // The real bug (not including characterCount in the check) is only triggered
  // when currentUsage < quota but currentUsage + newChars > quota.
  // This test passes with the buggy code and gives false confidence.
  it('returns true when user is already over their quota', () => {
    usageRecords.set(`user-2:${getCurrentMonth()}`, {
      userId: 'user-2',
      month: getCurrentMonth(),
      charactersUsed: 10001, // over the 10,000 free limit
    });

    // 10001 > 10000 → true even with the buggy `>` check
    // So this test passes, but it doesn't catch the off-by-one
    expect(isQuotaExceeded('user-2', 1)).toBe(true);
  });

  // ✗ FAILS — BUG-4: the check doesn't include characterCount.
  // Usage is under quota but the new job would push it over.
  it('returns true when new job would push user over quota', () => {
    usageRecords.set(`user-2:${getCurrentMonth()}`, {
      userId: 'user-2',
      month: getCurrentMonth(),
      charactersUsed: 9900, // under 10,000 limit
    });

    // 9900 + 200 = 10100 > 10000 → should be exceeded
    // FAILS: isQuotaExceeded checks 9900 > 10000 → false → not exceeded (wrong)
    expect(isQuotaExceeded('user-2', 200)).toBe(true);
  });
});

// ─── Sensitive Data ───────────────────────────────────────────────────────────

describe('Job data safety', () => {
  // ✗ FAILS — BUG-6: sensitive internal fields are present on stored job objects
  // and are never stripped before being serialised in API responses.
  it('job objects in the store do not carry sensitive internal fields', () => {
    const job = makeCompletedJob({ id: 'sensitive-job', internalCost: 0.42, retryCount: 3 });
    jobs.set('sensitive-job', job);

    const stored = jobs.get('sensitive-job');
    // FAILS: internalCost and retryCount ARE present
    expect(stored).not.toHaveProperty('internalCost');
    expect(stored).not.toHaveProperty('retryCount');
    expect(stored).not.toHaveProperty('processingNode');
  });
});
