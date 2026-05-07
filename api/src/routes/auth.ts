import { Hono } from 'hono';
import type { ContextVariables } from '../types/context';
import { requireAuth } from '../middleware/auth';
import { loginWithAppPassword } from '../services/bluesky';
import { createSession, clearSession } from '../services/session';
import { db } from '../db/index';
import { sessions } from '../db/schema';
import { eq } from 'drizzle-orm';

const authRouter = new Hono<{ Variables: ContextVariables }>();

authRouter.post('/bluesky', async (c) => {
  const body = await c.req.parseBody();
  const handle = (body['handle'] as string)?.trim();
  const password = (body['password'] as string);

  if (!handle || !password) {
    return c.json({ error: 'Bad Request', message: 'handle and password are required' }, 400);
  }

  try {
    const agent = await loginWithAppPassword({ identifier: handle, password });
    const profile = await agent.getProfile({ actor: handle });

    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await createSession(
      c,
      agent.session!.did,
      handle,
      agent.session!.accessJwt,
      agent.session!.refreshJwt,
      expiresAt,
      profile.data.displayName || undefined,
      profile.data.avatar || undefined
    );

    return c.json({
      user: {
        did: agent.session?.did,
        handle,
        displayName: profile.data.displayName || null,
        avatarUrl: profile.data.avatar || null,
      },
    });
  } catch (e: any) {
    const status = e?.status === 400 ? 401 : 500;
    return c.json({ error: 'Unauthorized', message: 'Invalid Bluesky credentials' }, status);
  }
});

authRouter.post('/logout', requireAuth, async (c) => {
  const sessionId = c.get('sessionId');
  if (sessionId) {
    await db.delete(sessions).where(eq(sessions.id, sessionId));
  }
  clearSession(c);
  return c.json({ ok: true });
});

authRouter.get('/me', requireAuth, async (c) => {
  return c.json({ user: c.get('user') });
});

export default authRouter;