import { createMiddleware } from 'hono/factory';
import { getSessionId, getCurrentUser } from '../services/session';
export const requireAuth = createMiddleware(async (c, next) => {
    const sessionId = getSessionId(c);
    const user = await getCurrentUser(sessionId);
    if (!user) {
        return c.json({ error: 'Unauthorized', message: 'Login required' }, 401);
    }
    c.set('user', user);
    c.set('sessionId', sessionId);
    await next();
});
export const optionalAuth = createMiddleware(async (c, next) => {
    const sessionId = getSessionId(c);
    const user = await getCurrentUser(sessionId);
    c.set('user', user ?? null);
    c.set('sessionId', sessionId);
    await next();
});
