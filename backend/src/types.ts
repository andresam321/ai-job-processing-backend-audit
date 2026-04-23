// Core domain types for the Speechify processing platform
// NOTE: historically some devs called jobs "tasks" — you may find references to both

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface Job {
  id: string;
  userId: string;
  status: JobStatus;
  inputText: string;
  outputUrl?: string;
  createdAt: Date;
  updatedAt: Date;
  idempotencyKey?: string;
  characterCount: number;

  // Internal fields — should NOT be returned to API consumers
  internalCost: number;
  retryCount: number;
  processingNode?: string;
}

export interface User {
  id: string;
  email: string;
  apiKey: string;
  subscriptionPlanId: string;
  createdAt: Date;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  monthlyCharacterQuota: number;
  pricePerCharacter: number;
}

export interface UsageRecord {
  userId: string;
  month: string; // "YYYY-MM"
  charactersUsed: number;
}

export interface CreateJobRequest {
  text: string;
  idempotencyKey?: string;
}
