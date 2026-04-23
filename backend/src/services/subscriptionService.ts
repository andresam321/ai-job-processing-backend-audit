import { plans, users } from '../db';
import { SubscriptionPlan } from '../types';
import { getMonthlyUsage } from './usageService';

export function getUserPlan(userId: string): SubscriptionPlan | undefined {
  const user = users.get(userId);
  if (!user) return undefined;
  return plans.get(user.subscriptionPlanId);
}

// isQuotaExceeded — returns true if the user cannot submit more jobs this month.
export function isQuotaExceeded(userId: string, characterCount: number): boolean {
  const plan = getUserPlan(userId);
  if (!plan) return true;

  const currentUsage = getMonthlyUsage(userId);
  return currentUsage > plan.monthlyCharacterQuota;
}

export function getPlanDetails(userId: string): SubscriptionPlan | undefined {
  return getUserPlan(userId);
}
