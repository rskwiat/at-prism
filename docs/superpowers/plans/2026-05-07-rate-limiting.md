# Rate Limiting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add rate limiting to login and upload endpoints with per-user tracking stored in memory.

**Architecture:** Create a rate limiter middleware that tracks request counts per handle (login) or per DID (uploads) using in-memory Maps with timestamp arrays. Apply to specific routes using Hono middleware.

**Tech Stack:** Hono (Node.js), TypeScript

---

## File Structure

- Create: `api/src/middleware/rate-limit.ts` - Rate limiter middleware class
- Modify: `api/src/routes/auth.ts` - Apply to login endpoint
- Modify: `api/src/routes/uploads.ts` - Apply to upload endpoint

---

## Task 1: Create Rate Limiter Middleware

**Files:**
- Create: `api/src/middleware/rate-limit.ts`

- [ ] **Step 1: Create rate limiter file**

```typescript
import type { MiddlewareHandler } from 'hono';

interface RateLimitConfig {
  limit: number;
  windowMs: number;
}

type KeyStore = Map<string, number[]>;

export class RateLimiter {
  private store: KeyStore;
  private limit: number;
  private windowMs: number;

  constructor(config: RateLimitConfig) {
    this.store = new Map();
    this.limit = config.limit;
    this.windowMs = config.windowMs;
  }

  getMiddleware(keyGetter?: (c: any) => string): MiddlewareHandler {
    return async (c, next) => {
      const key = keyGetter ? keyGetter(c) : (c.get('user')?.did || c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for')?.split(',')[0] || 'unknown');
      const now = Date.now();
      const windowStart = now - this.windowMs;

      const timestamps = this.store.get(key) || [];
      const recentTimestamps = timestamps.filter(ts => ts > windowStart);

      if (recentTimestamps.length >= this.limit) {
        return c.json(
          { error: 'Too Many Requests', message: 'Rate limit exceeded. Try again later.' },
          429
        );
      }

      recentTimestamps.push(now);
      this.store.set(key, recentTimestamps);

      await next();
    };
  }
}

export function createLoginRateLimiter() {
  const limiter = new RateLimiter({ limit: 1, windowMs: 60 * 1000 });
  return {
    getMiddleware: () => limiter.getMiddleware(async (c) => {
      const body = await c.req.parseBody();
      return (body['handle'] as string)?.trim();
    }),
  };
}

export function createUploadRateLimiter() {
  return new RateLimiter({ limit: 1, windowMs: 60 * 1000 });
}
```

- [ ] **Step 2: Commit**

```bash
git add api/src/middleware/rate-limit.ts
git commit -m "feat: add rate limiter middleware"
```

---

## Task 2: Apply Rate Limiting to Login Endpoint

**Files:**
- Modify: `api/src/routes/auth.ts:1-65`

- [ ] **Step 1: Add import to auth.ts**

Add after existing imports:
```typescript
import { createLoginRateLimiter } from '../middleware/rate-limit';
```

- [ ] **Step 2: Apply middleware to login route**

Add before the route handler:
```typescript
authRouter.post('/bluesky', createLoginRateLimiter().getMiddleware(), async (c) => {
```

- [ ] **Step 3: Commit**

```bash
git add api/src/routes/auth.ts
git commit -m "feat: apply rate limiting to login endpoint"
```

---

## Task 3: Apply Rate Limiting to Upload Endpoint

**Files:**
- Modify: `api/src/routes/uploads.ts:1-174`

- [ ] **Step 1: Add import to uploads.ts**

Add after existing imports:
```typescript
import { createUploadRateLimiter } from '../middleware/rate-limit';
```

- [ ] **Step 2: Apply middleware to upload route**

Add before the route handler:
```typescript
uploadsRouter.post('/', requireAuth, createUploadRateLimiter().getMiddleware(), async (c) => {
```

- [ ] **Step 3: Commit**

```bash
git add api/src/routes/uploads.ts
git commit -m "feat: apply rate limiting to upload endpoint"
```

---

## Task 4: Verify Implementation

- [ ] **Step 1: Run TypeScript build**

Run: `cd api && npm run build`
Expected: No errors

- [ ] **Step 2: Start server and test**

Start server in one terminal: `cd api && npm run dev`

Test login rate limiting:
```bash
curl -X POST http://localhost:3000/auth/bluesky -d "handle=test" -d "password=test"
```
Expected first request: appropriate response (may succeed or fail depending on credentials)
Expected second request within 1 minute: 429 with rate limit message

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "test: verify rate limiting works"
```

---

Plan complete and saved to `docs/superpowers/plans/2026-05-07-rate-limiting.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?