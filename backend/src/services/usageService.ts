import { jobs, usageRecords } from '../db';

export function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// getUsageForUser — returns total characters processed, for display purposes.
// Reads directly from the jobs store so the number stays accurate.
export function getUsageForUser(userId: string): number {
  let total = 0;
  jobs.forEach((job) => {
    if (job.status === 'completed') {
      total += job.characterCount;
    }
  });
  return total;
}

// getMonthlyUsage — fast-path read from the usage cache.
// Used for quota enforcement so we don't have to scan jobs on every request.
export function getMonthlyUsage(userId: string): number {
  const month = getCurrentMonth();
  const key = `${userId}:${month}`;
  return usageRecords.get(key)?.charactersUsed ?? 0;
}

// incrementUsage — records character consumption against the monthly quota.
export function incrementUsage(userId: string, characterCount: number): void {
  const month = getCurrentMonth();
  const key = `${userId}:${month}`;
  const existing = usageRecords.get(key);
  if (existing) {
    existing.charactersUsed += characterCount;
  } else {
    usageRecords.set(key, { userId, month, charactersUsed: characterCount });
  }
}

// decrementUsage — rolls back usage for a cancelled or failed job.
// TODO: wire this up to the job failure path.
export function decrementUsage(userId: string, characterCount: number): void {
  const month = getCurrentMonth();
  const key = `${userId}:${month}`;
  const existing = usageRecords.get(key);
  if (existing) {
    existing.charactersUsed = Math.max(0, existing.charactersUsed - characterCount);
  }
}
