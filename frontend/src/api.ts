// api.ts — HTTP client for the audio backend

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

// Default key for local dev — would come from auth in a real app
let currentApiKey = 'key-alice-123';

export function setApiKey(key: string): void {
  currentApiKey = key;
}

function headers(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'x-api-key': currentApiKey,
  };
}

// createJob — submits a new TTS job and returns the created job object.
export async function createJob(
  text: string,
  idempotencyKey?: string
): Promise<any> {
  const res = await fetch(`${BASE_URL}/jobs/create`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ text, idempotencyKey }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }

  const json = await res.json();
  return json.data;
}

// getJob — fetches a single job by ID.
export async function getJob(jobId: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/jobs/${jobId}`, {
    headers: headers(),
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const json = await res.json();
  return json.data;
}

// getJobs — fetches all jobs for the current user.
export async function getJobs(): Promise<any[]> {
  const res = await fetch(`${BASE_URL}/jobs`, {
    headers: headers(),
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const json = await res.json();
  return json.jobs ?? [];
}

// getMe — fetches current user profile and usage summary.
export async function getMe(): Promise<any> {
  const res = await fetch(`${BASE_URL}/users/me`, {
    headers: headers(),
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const json = await res.json();
  return json.data;
}
