# AI Job Processing Audit — Backend Engineering Assessment

## Overview

You've just joined a team and inherited a production backend service for an AI job processing platform. The system mostly works, but production is seeing real issues: users are being billed twice, usage totals are drifting, job results are inconsistent, and response times are growing linearly with system size.

Your task is to **audit the codebase, identify root causes, and apply minimal surgical fixes**.
This is not a feature-building exercise.

---

## Setup

```bash
pnpm install
pnpm dev      # Starts backend (port 3001) + frontend (port 3000)
pnpm test     # Runs the backend test suite
```

---

## Known Production Issues (No Solutions Provided)

The team has reported the following problems. Your job is to trace each one to its root cause:

1. **Duplicate job submissions**
   Users report being charged twice for the same request when retrying or submitting similar input multiple times. An idempotency mechanism may exist but is not consistently enforced.

2. **Incorrect usage tracking**
   Monthly usage totals do not match the sum of completed jobs. Some users hit quota limits earlier than expected; others are charged for failed jobs.

3. **Inconsistent API responses**
   Clients intermittently fail due to unexpected response shapes across endpoints.

4. **Job processing inconsistencies**
   Some jobs show a "completed" status but never produce output. The failure pattern appears inconsistent.

5. **Performance degradation**
   Usage lookup latency increases as total system jobs grow, even for unrelated users.

6. **Sensitive data exposure**
   Internal fields such as cost calculations or processing metadata are exposed in API responses.

---

## System Architecture

```
backend/src/
  routes/       — HTTP route handlers (jobs, users)
  services/     — Business logic (jobService, usageService, subscriptionService)
  workers/      — Async job processor (background polling loop)
  middleware/   — Auth middleware
  db.ts         — In-memory data store (source of truth)
  types.ts      — Shared TypeScript types
  app.ts        — Express app setup
  server.ts     — Entry point (listen + start processor)

frontend/src/
  App.tsx              — Main dashboard component
  api.ts               — HTTP client for backend
  components/
    JobForm.tsx         — Job creation form
    JobList.tsx         — Job list table
```

---

## Test Users

| User  | API Key       | Plan | Quota      |
| ----- | ------------- | ---- | ---------- |
| Alice | key-alice-123 | Pro  | 100,000/mo |
| Bob   | key-bob-456   | Free | 10,000/mo  |

---

## API Reference

| Method | Path         | Description                    |
| ------ | ------------ | ------------------------------ |
| POST   | /jobs/create | Create a new processing job    |
| GET    | /jobs/:id    | Fetch a single job             |
| GET    | /jobs        | List all jobs for current user |
| GET    | /users/me    | Current user + usage info      |

### POST /jobs/create

```json
{
  "text": "Hello world",
  "idempotencyKey": "optional-client-key"
}
```

---

## Assessment Goals

* Identify all bugs (there are between 8–12)
* Explain the **root cause** for each (not just the symptom)
* Apply fixes with **minimal code changes** — do not rewrite the system
* Note any bugs that interact across multiple files

**Time limit: 60–90 minutes**

---

## Open Practice Repository

This repository is open for anyone to use as a backend debugging and code auditing exercise.

### Tech Stack

* Backend: Node.js, Express, TypeScript
* Frontend: React, Vite, TypeScript
* Testing: Vitest/Jest
* Data Layer: In-memory store

### What this covers

* Idempotency and duplicate job handling
* Usage tracking inconsistencies
* API contract mismatches
* Async job processing bugs
* Performance bottlenecks
* Sensitive data exposure

This project simulates real production issues a backend engineer may inherit.
