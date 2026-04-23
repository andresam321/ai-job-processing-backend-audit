import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { jobs, users, usageRecords, seedDatabase } from '../src/db';
import { getCurrentMonth } from '../src/services/usageService';

// Reset state before each test so tests don't bleed into each other
beforeEach(() => {
  jobs.clear();
  usageRecords.clear();
  users.clear();
  seedDatabase();
});

// ─── Authentication ──────────────────────────────────────────────────────────

describe('Authentication', () => {
  it('rejects requests with no API key', async () => {
    const res = await request(app).post('/jobs/create').send({ text: 'hello' });
    expect(res.status).toBe(401);
  });

  it('rejects requests with an invalid API key', async () => {
    const res = await request(app)
      .post('/jobs/create')
      .set('x-api-key', 'not-a-real-key')
      .send({ text: 'hello' });
    expect(res.status).toBe(401);
  });
});

// ─── Job Creation ─────────────────────────────────────────────────────────────

describe('POST /jobs/create', () => {
  it('creates a job and returns 201', async () => {
    const res = await request(app)
      .post('/jobs/create')
      .set('x-api-key', 'key-alice-123')
      .send({ text: 'Hello world' });

    expect(res.status).toBe(201);
    // PASSES — but note: response is { job } not { data }
    // The frontend api.ts accesses .data which will be undefined
    expect(res.body.job).toBeDefined();
    expect(res.body.job.status).toBe('pending');
    expect(res.body.job.characterCount).toBe(11);
  });

  it('returns 400 when text body is missing', async () => {
    const res = await request(app)
      .post('/jobs/create')
      .set('x-api-key', 'key-alice-123')
      .send({});

    expect(res.status).toBe(400);
  });

  // ✗ FAILS — idempotency is broken: a second request with the same key creates
  // a NEW job instead of returning the existing one.
  it('returns the same job for a repeated idempotency key', async () => {
    const payload = { text: 'Repeated request', idempotencyKey: 'idem-key-001' };

    const first = await request(app)
      .post('/jobs/create')
      .set('x-api-key', 'key-alice-123')
      .send(payload);

    const second = await request(app)
      .post('/jobs/create')
      .set('x-api-key', 'key-alice-123')
      .send(payload);

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    // FAILS: two distinct job IDs are returned — duplicate jobs are created
    expect(first.body.job.id).toBe(second.body.job.id);
  });

  // ✗ FAILS — quota check ignores characterCount (off-by-one).
  // A job is allowed even though it would push the user over their quota.
  it('blocks job creation when the user is at their quota limit', async () => {
    // Bob's free plan: 10,000 char quota. Set usage to exactly 10,000.
    usageRecords.set(`user-2:${getCurrentMonth()}`, {
      userId: 'user-2',
      month: getCurrentMonth(),
      charactersUsed: 10000,
    });

    const res = await request(app)
      .post('/jobs/create')
      .set('x-api-key', 'key-bob-456')
      .send({ text: 'x' }); // 1 char — total would be 10,001

    // FAILS: isQuotaExceeded checks `currentUsage > quota` (10000 > 10000 = false)
    // so the job is incorrectly allowed
    expect(res.status).toBe(429);
  });
});

// ─── Job Retrieval ────────────────────────────────────────────────────────────

describe('GET /jobs/:id', () => {
  // PASSES — but hides BUG-6: sensitive fields (internalCost, retryCount,
  // processingNode) are present in the response and not tested here.
  it('returns the job in a data envelope', async () => {
    const create = await request(app)
      .post('/jobs/create')
      .set('x-api-key', 'key-alice-123')
      .send({ text: 'Fetch me' });

    const jobId = create.body.job.id;

    const res = await request(app)
      .get(`/jobs/${jobId}`)
      .set('x-api-key', 'key-alice-123');

    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.id).toBe(jobId);
    // Test does NOT assert that internalCost/retryCount are absent — bug goes unnoticed
  });

  it('returns 404 for an unknown job ID', async () => {
    const res = await request(app)
      .get('/jobs/does-not-exist')
      .set('x-api-key', 'key-alice-123');

    expect(res.status).toBe(404);
  });
});

// ─── Job Listing ─────────────────────────────────────────────────────────────

describe('GET /jobs', () => {
  // ✗ FAILS — INCORRECT TEST EXPECTATION.
  // The route returns { result: [...] } but this test checks res.body.jobs.
  // A candidate might "fix" this by changing the assertion to .result,
  // which would make the test pass — but the real issue is that all three
  // endpoints use different envelope keys, breaking the frontend uniformly.
  it('returns an array of jobs for the current user', async () => {
    await request(app)
      .post('/jobs/create')
      .set('x-api-key', 'key-alice-123')
      .send({ text: 'Job one' });

    await request(app)
      .post('/jobs/create')
      .set('x-api-key', 'key-alice-123')
      .send({ text: 'Job two' });

    const res = await request(app)
      .get('/jobs')
      .set('x-api-key', 'key-alice-123');

    expect(res.status).toBe(200);
    // WRONG KEY: should be res.body.result (what the route actually returns)
    expect(res.body.jobs).toHaveLength(2);
  });
});
