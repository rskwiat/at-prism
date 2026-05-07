import { Hono } from 'hono';
import type { ContextVariables } from '../types/context';
import { optionalAuth } from '../middleware/auth';
import { db } from '../db/index';
import { uploads, likes, users } from '../db/schema';
import { eq, sql, and } from 'drizzle-orm';

const usersRouter = new Hono<{ Variables: ContextVariables }>();

usersRouter.get('/:did', optionalAuth, async (c) => {
  const did = c.req.param('did');
  const user = await db.query.users.findFirst({ where: eq(users.did, did) });
  if (!user) return c.json({ error: 'Not Found', message: 'User not found' }, 404);
  return c.json({ user: { did: user.did, handle: user.handle, displayName: user.displayName, avatarUrl: user.avatarUrl } });
});

usersRouter.get('/:did/uploads', optionalAuth, async (c) => {
  const did = c.req.param('did');
  const user = c.get('user');
  const isOwner = user && user.did === did;

  const results = await db.select({
    id: uploads.id,
    userDid: uploads.userDid,
    title: uploads.title,
    description: uploads.description,
    url: uploads.url,
    thumbnailUrl: uploads.thumbnailUrl,
    mimeType: uploads.mimeType,
    width: uploads.width,
    height: uploads.height,
    createdAt: uploads.createdAt,
    likeCount: sql<number>`(SELECT COUNT(*) FROM likes WHERE likes.upload_id = ${uploads.id})`,
  })
    .from(uploads)
    .where(isOwner ? eq(uploads.userDid, did) : and(eq(uploads.userDid, did), eq(uploads.isPublic, true)))
    .orderBy(sql`${uploads.createdAt} DESC`);

  if (user && results.length > 0) {
    const uploadIds = results.map(i => i.id);
    const userLikes = await db.select({ uploadId: likes.uploadId })
      .from(likes)
      .where(and(eq(likes.userDid, user.did), sql`${likes.uploadId} IN (${sql.join(uploadIds.map(id => sql`${id}`), sql`, `)})`));
    const likedSet = new Set(userLikes.map(l => l.uploadId));
    results.forEach(item => (item as any).hasLiked = likedSet.has(item.id));
  }

  return c.json({ items: results });
});

export default usersRouter;