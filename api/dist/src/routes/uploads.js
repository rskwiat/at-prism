import { Hono } from 'hono';
import { requireAuth, optionalAuth } from '../middleware/auth';
import { createUploadRateLimiter } from '../middleware/rate-limit';
import { db } from '../db/index';
import { uploads, likes } from '../db/schema';
import { eq, sql, and, desc } from 'drizzle-orm';
import { uploadToS3, getUploadKey, getThumbnailKey, deleteFromS3 } from '../services/storage';
import { processUpload } from '../services/image';
import { postImageToBluesky, createAgent } from '../services/bluesky';
import { getUserAccessToken } from '../services/session';
import { v4 as uuid } from 'uuid';
const uploadsRouter = new Hono();
uploadsRouter.get('/', optionalAuth, async (c) => {
    const sort = c.req.query('sort') || 'recent';
    const limit = Math.min(parseInt(c.req.query('limit') || '20'), 50);
    const results = await db.select({
        id: uploads.id,
        userDid: uploads.userDid,
        title: uploads.title,
        description: uploads.description,
        url: uploads.url,
        thumbnailUrl: uploads.thumbnailUrl,
        mimeType: uploads.mimeType,
        sizeBytes: uploads.sizeBytes,
        width: uploads.width,
        height: uploads.height,
        isPublic: uploads.isPublic,
        blueskyPostUri: uploads.blueskyPostUri,
        createdAt: uploads.createdAt,
        likeCount: sql `(SELECT COUNT(*) FROM likes WHERE likes.upload_id = ${uploads.id})`,
    })
        .from(uploads)
        .where(eq(uploads.isPublic, true))
        .orderBy(sort === 'trending' ? desc(sql `likeCount`) : desc(uploads.createdAt))
        .limit(limit);
    const user = c.get('user');
    if (user && results.length > 0) {
        const uploadIds = results.map(i => i.id);
        const userLikes = await db.select({ uploadId: likes.uploadId })
            .from(likes)
            .where(and(eq(likes.userDid, user.did), sql `${likes.uploadId} IN (${sql.join(uploadIds.map(id => sql `${id}`), sql `, `)})`));
        const likedSet = new Set(userLikes.map(l => l.uploadId));
        results.forEach(item => item.hasLiked = likedSet.has(item.id));
    }
    return c.json({ items: results, cursor: null });
});
uploadsRouter.get('/:id', optionalAuth, async (c) => {
    const id = c.req.param('id');
    const upload = await db.query.uploads.findFirst({ where: eq(uploads.id, id) });
    if (!upload)
        return c.json({ error: 'Not Found', message: 'Upload not found' }, 404);
    if (!upload.isPublic) {
        const user = c.get('user');
        if (!user || user.did !== upload.userDid) {
            return c.json({ error: 'Not Found', message: 'Upload not found' }, 404);
        }
    }
    const likeCount = await db.select({ count: sql `count(*)` }).from(likes).where(eq(likes.uploadId, id));
    const user = c.get('user');
    let hasLiked = false;
    if (user) {
        const like = await db.query.likes.findFirst({ where: and(eq(likes.uploadId, id), eq(likes.userDid, user.did)) });
        hasLiked = !!like;
    }
    return c.json({ ...upload, likeCount: likeCount[0].count, hasLiked });
});
uploadsRouter.post('/', requireAuth, createUploadRateLimiter().getMiddleware(), async (c) => {
    try {
        const user = c.get('user');
        const body = await c.req.parseBody();
        const file = body['file'];
        const title = body['title'];
        const description = body['description'] || '';
        const isPublic = body['isPublic'] !== 'false';
        const shareToBluesky = body['shareToBluesky'] === 'true';
        const blueskyCaption = body['blueskyCaption'] || title;
        if (!file || !title) {
            return c.json({ error: 'Bad Request', message: 'file and title are required' }, 400);
        }
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const processed = await processUpload(buffer);
        const uploadId = uuid();
        const s3Key = getUploadKey(uploadId, file.name);
        const thumbKey = getThumbnailKey(uploadId);
        const url = await uploadToS3(s3Key, buffer, file.type);
        const thumbUrl = await uploadToS3(thumbKey, processed.thumbnail, 'image/webp');
        let blueskyPostUri = null;
        if (shareToBluesky) {
            try {
                const sessionId = c.get('sessionId');
                if (sessionId) {
                    const creds = await getUserAccessToken(sessionId);
                    if (creds) {
                        const agent = await createAgent(creds.accessToken, creds.did, creds.refreshToken, creds.handle);
                        blueskyPostUri = await postImageToBluesky(agent, blueskyCaption, buffer, title);
                        console.log('Posted to Bluesky:', blueskyPostUri);
                    }
                }
            }
            catch (e) {
                console.error('Failed to post to Bluesky:', e);
            }
        }
        await db.insert(uploads).values({
            id: uploadId,
            userDid: user.did,
            title,
            description,
            s3Key,
            url,
            thumbnailUrl: thumbUrl,
            mimeType: processed.metadata.mimeType,
            sizeBytes: processed.metadata.sizeBytes,
            width: processed.metadata.width,
            height: processed.metadata.height,
            isPublic,
            isListed: true,
            blueskyPostUri,
        });
        return c.json({ id: uploadId, url, thumbnailUrl: thumbUrl, isPublic, blueskyPostUri }, 201);
    }
    catch (e) {
        console.error('Upload error:', e);
        return c.json({ error: 'Internal Error', message: e.message || 'Upload failed' }, 500);
    }
});
uploadsRouter.delete('/:id', requireAuth, async (c) => {
    const id = c.req.param('id');
    const user = c.get('user');
    const upload = await db.query.uploads.findFirst({ where: eq(uploads.id, id) });
    if (!upload)
        return c.json({ error: 'Not Found', message: 'Upload not found' }, 404);
    if (upload.userDid !== user.did)
        return c.json({ error: 'Forbidden', message: 'Not your upload' }, 403);
    await deleteFromS3(upload.s3Key);
    const thumbKey = getThumbnailKey(id);
    await deleteFromS3(thumbKey).catch(() => { });
    await db.delete(uploads).where(eq(uploads.id, id));
    return c.json({ deleted: true });
});
uploadsRouter.post('/:id/like', requireAuth, async (c) => {
    const id = c.req.param('id');
    const user = c.get('user');
    const existing = await db.query.likes.findFirst({ where: and(eq(likes.uploadId, id), eq(likes.userDid, user.did)) });
    if (existing)
        return c.json({ error: 'Conflict', message: 'Already liked' }, 409);
    await db.insert(likes).values({ uploadId: id, userDid: user.did });
    return c.json({ liked: true }, 201);
});
uploadsRouter.delete('/:id/like', requireAuth, async (c) => {
    const id = c.req.param('id');
    const user = c.get('user');
    await db.delete(likes).where(and(eq(likes.uploadId, id), eq(likes.userDid, user.did)));
    return c.json({ liked: false });
});
export default uploadsRouter;
