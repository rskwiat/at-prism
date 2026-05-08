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

  getMiddleware(keyGetter?: (c: any) => string | Promise<string>): MiddlewareHandler {
    return async (c, next) => {
      const key = keyGetter ? await keyGetter(c) : (c.get('user')?.did || c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for')?.split(',')[0] || 'unknown');
      const now = Date.now();
      const windowStart = now - this.windowMs;

      const timestamps = this.store.get(key) || [];
      const recentTimestamps = timestamps.filter(ts => ts > windowStart);

      if (recentTimestamps.length === 0) {
        this.store.delete(key);
      }

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
  const limiter = new RateLimiter({ limit: 1, windowMs: 60 * 1000 });
  return {
    getMiddleware: () => limiter.getMiddleware(),
  };
}