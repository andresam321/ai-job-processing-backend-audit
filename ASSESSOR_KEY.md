# ASSESSOR KEY — Do not distribute to candidates

## Bug Inventory (12 bugs total)

---

### BUG-1 · Idempotency not enforced
**Files:** `backend/src/services/jobService.ts` + `backend/src/routes/jobs.ts`
**Symptom:** Two requests with the same `idempotencyKey` create two distinct jobs.

**Root cause A** (`jobService.ts` line ~18):
```typescript
// Missing && j.userId === userId
const existing = Array.from(jobs.values()).find(
  (j) => j.idempotencyKey === idempotencyKey
);
```
The lookup doesn't scope to the requesting user. User B can collide with User A's key.

**Root cause B** (`routes/jobs.ts`):
`incrementUsage` is called _before_ `createJob`. If the idempotency check inside
`createJob` returns an existing job, usage has already been incremented — double billing.

**Fix:**
1. Add `&& j.userId === userId` to the `.find()` predicate.
2. Move `incrementUsage` call to _after_ `createJob`, only when a new job is actually created.

---

### BUG-2 · Race condition in job processor
**File:** `backend/src/workers/jobProcessor.ts`
**Symptom:** Under load, the same job is processed twice; usage is charged twice.

**Root cause:**
```typescript
// setInterval tick 1 sees status === 'pending', calls processJob(job)
// setInterval tick 2 fires before job.status = 'processing' executes
if (job.status === 'pending') {     // ← both ticks pass this check
  processJob(job).catch(...)        // ← both enter the function
}
// Inside processJob:
job.status = 'processing';          // ← only reached after await gap
```
The status guard and the status mutation are not atomic.

**Fix:** Set `job.status = 'processing'` _synchronously before_ any `await`, ideally
as the very first line of `processJob` (before `incrementUsage`).

---

### BUG-3 · Double billing — usage incremented in both route and worker
**Files:** `backend/src/routes/jobs.ts` + `backend/src/workers/jobProcessor.ts`
**Symptom:** Every job consumes 2× its actual character count from the quota.

**Root cause:**
`incrementUsage` is called in the route handler (line ~33 of `routes/jobs.ts`)
AND again at the top of `processJob` in the worker. Each submitted job hits the
usage counter twice.

**Fix:** Remove `incrementUsage` from the route handler. Call it only in the worker,
and only after confirmed success (see BUG-3b below).

**BUG-3b:** Even in the worker, `incrementUsage` is called _before_ the async
processing step. If the job fails, usage is not rolled back (`decrementUsage` exists
but is dead code). Move `incrementUsage` to the success branch of the try/catch.

---

### BUG-4 · Quota check ignores new job's character count (off-by-one)
**File:** `backend/src/services/subscriptionService.ts`
**Symptom:** Users can exceed their quota by submitting jobs that push them over.

**Root cause:**
```typescript
return currentUsage > plan.monthlyCharacterQuota;
// Should be:
return (currentUsage + characterCount) > plan.monthlyCharacterQuota;
```
The `characterCount` parameter is accepted but never used. A user at 99 999/100 000
can submit a 10 000-character job and bring their total to 109 999.

**Fix:** Change to `(currentUsage + characterCount) > plan.monthlyCharacterQuota`.

---

### BUG-5 · Inconsistent API response envelopes
**Files:** `backend/src/routes/jobs.ts` + `frontend/src/api.ts`
**Symptom:** Frontend job list is always empty; newly created jobs never appear in the UI.

**Root cause:** Three endpoints use three different envelope keys:
| Endpoint | Returns |
|---|---|
| `POST /jobs/create` | `{ job: ... }` |
| `GET /jobs/:id` | `{ data: ... }` |
| `GET /jobs` | `{ result: [...] }` |

`api.ts` reads `json.data` from the POST response (gets `undefined`) and
`json.jobs` from the GET list response (also `undefined`, falls back to `[]`).

**Fix:** Standardise all endpoints to `{ data: ... }` / `{ data: [...] }`.
Update `api.ts` to read `json.data` and `json.job` consistently.

---

### BUG-6 · Sensitive internal fields exposed in API responses
**Files:** `backend/src/services/jobService.ts` + `backend/src/routes/jobs.ts`
**Symptom:** `GET /jobs/:id` and `GET /jobs` responses include `internalCost`,
`retryCount`, and `processingNode`.

**Root cause:** `getJob` and `getJobsForUser` return raw `Job` objects which carry
internal fields. There is no serialization layer to strip them.

**Fix:** Introduce a `toPublicJob(job: Job)` helper that omits the sensitive fields,
and call it before sending any response.

---

### BUG-7 · Double HTTP request on form submit
**File:** `frontend/src/components/JobForm.tsx`
**Symptom:** Every "Create Job" click sends two `POST /jobs/create` requests.

**Root cause:**
```tsx
<form onSubmit={handleSubmit}>         {/* fires handleSubmit on submit */}
  <button type="submit" onClick={handleSubmit}>  {/* ALSO fires handleSubmit on click */}
```
The button's `onClick` and the form's `onSubmit` both invoke `handleSubmit`.
Additionally, `e.preventDefault()` is missing, so native form submission may
also trigger a page reload.

**Fix:**
1. Remove the `onClick` from the button (keep `type="submit"` + form `onSubmit`), or
2. Remove `onSubmit` from the form and keep `onClick` on the button.
3. Add `e.preventDefault()` at the top of `handleSubmit`.

---

### BUG-8 · Jobs list permanently empty (frontend state never populated)
**Files:** `frontend/src/api.ts` + `frontend/src/App.tsx`
**Symptom:** Dashboard shows "No jobs yet" even after jobs are created.

**Root cause (two parts — both must be fixed):**
1. `api.ts::getJobs()` reads `json.jobs` but backend returns `{ result: [...] }` → always `[]`.
2. `api.ts::createJob()` reads `json.data` but backend returns `{ job: {...} }` → `undefined`.
   `handleJobCreated(undefined)` skips the optimistic prepend.

**Fix:** See BUG-5 — fixing the envelope inconsistency resolves both symptoms.

---

### BUG-9 · O(n) global job scan on every usage display call
**File:** `backend/src/services/usageService.ts`
**Symptom:** `/users/me` and `GET /jobs` become slower as the total number of
jobs in the system grows, regardless of the queried user.

**Root cause (two issues):**
1. `getUsageForUser` iterates the entire `jobs` Map with no `userId` filter.
2. Even if the filter were added, scanning the Map every request is O(n total jobs)
   rather than O(1) from the `usageRecords` cache.

```typescript
// Missing filter:
jobs.forEach((job) => {
  if (job.status === 'completed') { // ← counts ALL users' jobs
    total += job.characterCount;
  }
});
```

**Fix:**
1. Add `job.userId === userId &&` to the condition, or
2. (Better) Delete `getUsageForUser` and replace all call sites with `getMonthlyUsage`,
   which reads from the O(1) `usageRecords` cache.

---

### BUG-10 · Test with wrong assertion key (jobs list test)
**File:** `backend/tests/jobs.test.ts` — "returns an array of jobs for the current user"
**Symptom:** Test fails with `expect(undefined).toHaveLength(2)`.

**Root cause:**
The test asserts `res.body.jobs` but the route returns `{ result: [...] }`.
This is an incorrect test expectation — it also masks the fact that the route's
own key is wrong (should be `data`).

**How a candidate might be misled:** They fix the test to use `res.body.result` and
it passes — but the frontend is still broken because the underlying inconsistency
(three different keys) is not addressed.

---

### BUG-11 · Silent failure — failed jobs reported as completed
**File:** `backend/src/workers/jobProcessor.ts`
**Symptom:** ~10% of jobs show `status: completed` with no `outputUrl`. Consumers
cannot distinguish a real completion from a silent failure.

**Root cause:**
```typescript
} catch (_err) {
  job.retryCount += 1;
  updateJobStatus(job.id, 'completed');  // ← should be 'failed'
}
```

**Fix:** Change `'completed'` to `'failed'` in the catch block.

---

### BUG-12 · Shared state mutation — live object references leaked
**File:** `backend/src/services/jobService.ts`
**Symptom:** Mutating a returned job object in one part of the code unexpectedly
mutates the stored record for all other callers (e.g., middleware or tests).

**Root cause:** `getJob` and `getJobsForUser` return direct references to the
objects stored in the `jobs` Map.
```typescript
return jobs.get(jobId); // live reference
```

**Fix:** Return a shallow copy:
```typescript
const job = jobs.get(jobId);
return job ? { ...job } : undefined;
```
Or use a read-only type wrapper.

---

## Test Outcome Summary

| Test | Expected outcome | Reason |
|---|---|---|
| `rejects requests with no API key` | ✅ PASS | Correctly tests auth |
| `rejects requests with an invalid API key` | ✅ PASS | Correctly tests auth |
| `creates a job and returns 201` | ✅ PASS | Passes but doesn't test sensitive field leak |
| `returns 400 when text body is missing` | ✅ PASS | Validation works |
| `returns existing job for duplicate idempotency key` | ❌ FAIL | Idempotency not enforced (BUG-1) |
| `blocks job creation when the user is at their quota limit` | ❌ FAIL | Off-by-one quota check (BUG-4) |
| `returns the job in a data envelope` | ✅ PASS | Hides BUG-6 (sensitive fields not checked) |
| `returns 404 for an unknown job ID` | ✅ PASS | Error path works |
| `returns an array of jobs for the current user` | ❌ FAIL | **Incorrect expectation** — `body.jobs` vs `body.result` (BUG-5/10) |
| `getUsageForUser returns total completed job characters` | ✅ PASS | **Misleading** — hides BUG-9 (no userId filter), passes in isolation |
| `does not count other users completed jobs` | ❌ FAIL | BUG-9 exposed when two users' jobs coexist |
| `incrementUsage correctly adds to monthly total` | ✅ PASS | The function itself is correct |
| `returns true when user is already over their quota` | ✅ PASS | **Misleading** — tests over-quota case; BUG-4 only triggers at boundary |
| `returns true when new job would push user over quota` | ❌ FAIL | BUG-4 — characterCount not included in check |
| `job objects in the store do not carry sensitive internal fields` | ❌ FAIL | BUG-6 — sensitive fields present |

**Pass: 8 | Fail: 5 | Misleading pass: 2**

---

## Bug Interaction Map

```
BUG-1 (idempotency) ←──→ BUG-3 (double billing)
  usage incremented before idempotency check, so a retry
  still bills even when an existing job is returned.

BUG-2 (race condition) ←──→ BUG-3 (double billing)
  Two concurrent processJob() calls each call incrementUsage(),
  tripling (or more) the billed character count for one job.

BUG-5 (response envelope) ←──→ BUG-8 (stale UI)
  api.ts reads wrong keys because backend returns inconsistent shapes.
  Fixing BUG-5 on both ends resolves BUG-8 automatically.

BUG-9 (global scan) ←──→ BUG-3 (double billing)
  getUsageForUser over-counts (no userId filter) AND the underlying
  cache (getMonthlyUsage) is inflated by double-billing.
  Both bugs must be fixed for usage numbers to be correct.
```

Bugs spanning 3+ files: **BUG-3** (routes/jobs.ts → workers/jobProcessor.ts → services/usageService.ts)
