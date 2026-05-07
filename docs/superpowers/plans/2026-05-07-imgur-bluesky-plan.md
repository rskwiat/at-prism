# Imgur-Bluesky App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a photo-sharing app with Bluesky auth, image uploads to S3, public gallery with likes, and optional Bluesky cross-posting.

**Architecture:** Monorepo with Hono REST API (backend) and Vite+React SPA (frontend). SQLite + Drizzle ORM for data, S3-compatible storage for images, `@atproto/api` for Bluesky integration. Frontend is just an API client.

**Tech Stack:** Hono, Drizzle ORM, SQLite, Sharp, S3 (@aws-sdk/client-s3), @atproto/api, React, React Router, Zustand

---

## File Structure

```
api/src/
├── index.ts                  # Hono app entry, server start
├── routes/
│   ├── uploads.ts            # Upload CRUD + like endpoints
│   ├── auth.ts               # Bluesky login/logout
│   └── users.ts              # User profile endpoints
├── db/
│   ├── index.ts              # Database connection
│   ├── schema.ts             # Drizzle schema (uploads, likes, users)
│   └── migrate.ts             # Migration runner
├── services/
│   ├── storage.ts            # S3 upload/download/delete
│   ├── image.ts              # Sharp processing (resize, thumb)
│   ├── bluesky.ts            # Bluesky session + post creation
│   └── session.ts            # Cookie session management
├── middleware/
│   └── auth.ts               # Auth middleware (requireAuth, optionalAuth)
└── types/
    └── index.ts              # Shared types

app/src/
├── main.tsx                   # React entry
├── App.tsx                    # Router setup
├── api/
│   └── client.ts             # API fetch wrapper
├── components/
│   ├── Navbar.tsx
│   ├── ImageCard.tsx
│   ├── ImageGrid.tsx
│   ├── UploadDropzone.tsx
│   ├── LikeButton.tsx
│   └── AuthForm.tsx
├── pages/
│   ├── Home.tsx               # Public gallery
│   ├── Upload.tsx
│   ├── ImageView.tsx
│   ├── Auth.tsx
│   ├── Gallery.tsx
│   └── Profile.tsx
└── stores/
    └── authStore.ts          # Auth state (Zustand)
```

---

## Task 1: Project Foundation — Dependencies & Config

**Files:**
- Modify: `api/package.json`
- Modify: `app/package.json`
- Create: `api/.env.example`
- Create: `api/src/types/index.ts`
- Create: `api/src/db/index.ts`
- Create: `api/src/db/schema.ts`

- [ ] **Step 1: Add API dependencies**

Modify `api/package.json` — replace dependencies section:

```json
{
  "dependencies": {
    "@atproto/api": "^0.15.0",
    "@aws-sdk/client-s3": "^3.700.0",
    "@hono/node-server": "^1.19.14",
    "@hono/zod-openapi": "^0.16.0",
    "drizzle-orm": "^0.39.0",
    "hono": "^4.12.18",
    "sharp": "^0.33.0",
    "zod": "^3.24.0"
  },
  "devDependencies": {
    "@types/node": "^20.11.17",
    "drizzle-kit": "^0.30.0",
    "tsx": "^4.7.1",
    "typescript": "^5.8.3"
  }
}
```

Run: `cd /Users/rskwiat/Projects/imgur-bluesky-app/api && npm install`

- [ ] **Step 2: Add frontend dependencies**

Modify `app/package.json` — add to dependencies:

```json
{
  "dependencies": {
    "@tanstack/react-query": "^5.60.0",
    "react": "^19.2.5",
    "react-dom": "^19.2.5",
    "react-router-dom": "^7.0.0",
    "zustand": "^5.0.0"
  }
}
```

Run: `cd /Users/rskwiat/Projects/imgur-bluesky-app/app && npm install`

- [ ] **Step 3: Create .env.example**

Create `api/.env.example`:

```env
DATABASE_URL=file:./data.db
S3_ENDPOINT=https://your-account.r2.cloudflarestorage.com
S3_REGION=auto
S3_BUCKET=imgur-uploads
S3_ACCESS_KEY_ID=your-access-key
S3_SECRET_ACCESS_KEY=your-secret-key
APP_URL=http://localhost:3000
SESSION_SECRET=change-me-to-a-long-random-string
BLUESKY_SERVICE=https://bsky.social
```

- [ ] **Step 4: Create shared types**

Create `api/src/types/index.ts`:

```typescript
export interface Upload {
  id: string;
  userDid: string;
  userHandle: string;
  title: string;
  description: string;
  url: string;
  thumbnailUrl: string;
  mimeType: string;
  sizeBytes: number;
  width: number;
  height: number;
  isPublic: boolean;
  isListed: boolean;
  blueskyPostUri: string | null;
  createdAt: string;
  likeCount: number;
  hasLiked: boolean;
}

export interface User {
  did: string;
  handle: string;
  displayName: string | null;
  avatarUrl: string | null;
}

export interface PaginatedResponse<T> {
  items: T[];
  cursor: string | null;
}

export interface ApiError {
  error: string;
  message: string;
}
```

- [ ] **Step 5: Create Drizzle schema**

Create `api/src/db/schema.ts`:

```typescript
import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const uploads = sqliteTable('uploads', {
  id: text('id').primaryKey(),
  userDid: text('user_did').notNull(),
  title: text('title').notNull(),
  description: text('description').default(''),
  s3Key: text('s3_key').notNull(),
  url: text('url').notNull(),
  thumbnailUrl: text('thumbnail_url').notNull(),
  mimeType: text('mime_type').notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  width: integer('width').notNull(),
  height: integer('height').notNull(),
  isPublic: integer('is_public', { mode: 'boolean' }).default(true).notNull(),
  isListed: integer('is_listed', { mode: 'boolean' }).default(true).notNull(),
  blueskyPostUri: text('bluesky_post_uri'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
});

export const likes = sqliteTable('likes', {
  uploadId: text('upload_id').notNull().references(() => uploads.id, { onDelete: 'cascade' }),
  userDid: text('user_did').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
}, (table) => ({
  pk: uniqueIndex('likes_pk').on(table.uploadId, table.userDid),
}));

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userDid: text('user_did').notNull(),
  handle: text('handle').notNull(),
  displayName: text('display_name'),
  avatarUrl: text('avatar_url'),
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
});
```

- [ ] **Step 6: Create DB connection**

Create `api/src/db/index.ts`:

```typescript
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from './schema';

const sqlite = new Database(process.env.DATABASE_URL?.replace('file:', '') || './data.db');
export const db = drizzle(sqlite, { schema });

export function runMigrations() {
  migrate(db, { migrationsFolder: './drizzle' });
}
```

- [ ] **Step 7: Generate Drizzle config**

Create `api/drizzle.config.ts`:

```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.DATABASE_URL?.replace('file:', '') || './data.db',
  },
});
```

- [ ] **Step 8: Create initial migration**

Run: `cd /Users/rskwiat/Projects/imgur-bluesky-app/api && npx drizzle-kit generate`

- [ ] **Step 9: Commit**

```bash
cd /Users/rskwiat/Projects/imgur-bluesky-app
git init 2>/dev/null; git add -A; git commit -m "feat: project foundation — deps, Drizzle schema, DB setup"
```

---

## Task 2: S3 Storage Service

**Files:**
- Create: `api/src/services/storage.ts`
- Create: `api/src/services/image.ts`
- Modify: `api/src/index.ts` (add S3 env validation)

- [ ] **Step 1: Create storage service**

Create `api/src/services/storage.ts`:

```typescript
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: true,
});

const BUCKET = process.env.S3_BUCKET!;

export async function uploadToS3(key: string, body: Buffer, contentType: string): Promise<string> {
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType,
  }));
  return `https://${BUCKET}.${process.env.S3_ENDPOINT?.replace('https://', '')}/${key}`;
}

export async function getSignedDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
  const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return getSignedUrl(s3, cmd, { expiresIn });
}

export async function deleteFromS3(key: string): Promise<void> {
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

export function getS3Key(uploadId: string, filename: string): string {
  const ext = filename.split('.').pop() || 'jpg';
  return `uploads/${uploadId}/original.${ext}`;
}

export function getThumbnailKey(uploadId: string): string {
  return `uploads/${uploadId}/thumbnail.webp`;
}
```

- [ ] **Step 2: Create image processing service**

Create `api/src/services/image.ts`:

```typescript
import sharp from 'sharp';

export interface ImageMetadata {
  width: number;
  height: number;
  sizeBytes: number;
  mimeType: string;
}

export interface ProcessedImage {
  metadata: ImageMetadata;
  thumbnail: Buffer;
}

export async function getMetadata(buffer: Buffer): Promise<ImageMetadata> {
  const meta = await sharp(buffer).metadata();
  return {
    width: meta.width ?? 0,
    height: meta.height ?? 0,
    sizeBytes: buffer.length,
    mimeType: `image/${meta.format ?? 'jpeg'}`,
  };
}

export async function processUpload(buffer: Buffer, maxDimension = 2000): Promise<ProcessedImage> {
  const meta = await getMetadata(buffer);

  let processed = await sharp(buffer).rotate().normalize();
  if (meta.width > maxDimension || meta.height > maxDimension) {
    processed = processed.resize(maxDimension, maxDimension, { fit: 'inside', withoutEnlargement: true });
  }

  const thumbnail = await sharp(buffer)
    .rotate()
    .resize(400, 400, { fit: 'cover' })
    .webp({ quality: 80 })
    .toBuffer();

  return { metadata: meta, thumbnail };
}

export function imageToBuffer(image: sharp.Sharp): Buffer {
  return image.toBuffer();
}
```

- [ ] **Step 3: Add env validation to index.ts**

Create `api/src/validate-env.ts`:

```typescript
import 'dotenv/config';

const required = ['DATABASE_URL', 'S3_ENDPOINT', 'S3_REGION', 'S3_BUCKET', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY', 'APP_URL', 'SESSION_SECRET', 'BLUESKY_SERVICE'] as const;

export function validateEnv() {
  const missing = required.filter(k => !process.env[k]);
  if (missing.length) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}`);
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add api/src/services/ api/src/validate-env.ts && git commit -m "feat: S3 storage and image processing services"
```

---

## Task 3: Session & Auth Middleware

**Files:**
- Create: `api/src/services/session.ts`
- Create: `api/src/middleware/auth.ts`
- Create: `api/src/services/bluesky.ts`

- [ ] **Step 1: Create session service**

Create `api/src/services/session.ts`:

```typescript
import { Hono } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { db } from '../db/index';
import { sessions } from '../db/schema';
import { eq } from 'drizzle-orm';
import { randomBytes } from 'crypto';
import type { User } from '../types';

const SESSION_COOKIE = 'session';
const SESSION_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days

export function getSessionId(c: any): string | undefined {
  return getCookie(c, SESSION_COOKIE);
}

export function setSession(c: any, sessionId: string, userDid: string, handle: string, accessToken: string, refreshToken: string, displayName?: string, avatarUrl?: string) {
  setCookie(c, SESSION_COOKIE, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax',
    maxAge: SESSION_DURATION / 1000,
    path: '/',
  });
}

export function clearSession(c: any) {
  deleteCookie(c, SESSION_COOKIE, { path: '/' });
}

export function generateSessionId(): string {
  return randomBytes(32).toString('hex');
}

export async function getCurrentUser(sessionId: string | undefined): Promise<User | null> {
  if (!sessionId) return null;
  const session = await db.query.sessions.findFirst({
    where: eq(sessions.id, sessionId),
  });
  if (!session) return null;
  if (new Date(session.expiresAt) < new Date()) {
    await db.delete(sessions).where(eq(sessions.id, sessionId));
    return null;
  }
  return {
    did: session.userDid,
    handle: session.handle,
    displayName: session.displayName ?? null,
    avatarUrl: session.avatarUrl ?? null,
  };
}
```

- [ ] **Step 2: Create auth middleware**

Create `api/src/middleware/auth.ts`:

```typescript
import { createMiddleware } from 'hono/factory';
import { getSessionId, getCurrentUser } from '../services/session';

export const requireAuth = createMiddleware(async (c, next) => {
  const sessionId = getSessionId(c);
  const user = await getCurrentUser(sessionId);
  if (!user) {
    return c.json({ error: 'Unauthorized', message: 'Login required' }, 401);
  }
  c.set('user', user);
  await next();
});

export const optionalAuth = createMiddleware(async (c, next) => {
  const sessionId = getSessionId(c);
  const user = await getCurrentUser(sessionId);
  c.set('user', user ?? null);
  await next();
});
```

- [ ] **Step 3: Create Bluesky service**

Create `api/src/services/bluesky.ts`:

```typescript
import { BskyAgent, RichText } from '@atproto/api';

export interface BlueskyCredentials {
  identifier: string; // handle or DID
  password: string;
}

export async function loginWithAppPassword(creds: BlueskyCredentials) {
  const agent = new BskyAgent({ service: process.env.BLUESKY_SERVICE! });
  await agent.login({ identifier: creds.identifier, password: creds.password });
  return agent;
}

export async function postToBluesky(agent: BskyAgent, caption: string, imageUrl: string, imageAlt?: string) {
  const rt = new RichText({ text: caption });
  await rt.detectFacets(agent);

  const post = await agent.post({
    text: rt.text,
    facets: rt.facets,
    embed: {
      $type: 'app.bsky.embed.external',
      external: {
        uri: imageUrl,
        title: 'Image',
        description: imageAlt || 'Shared via imgur-bluesky',
      },
    },
  });

  return post.uri;
}
```

- [ ] **Step 4: Commit**

```bash
git add api/src/services/session.ts api/src/services/bluesky.ts api/src/middleware/auth.ts && git commit -m "feat: session and auth middleware"
```

---

## Task 4: Upload Routes

**Files:**
- Create: `api/src/routes/uploads.ts`
- Create: `api/src/routes/auth.ts`
- Create: `api/src/routes/users.ts`
- Modify: `api/src/index.ts`

- [ ] **Step 1: Create upload routes**

Create `api/src/routes/uploads.ts`:

```typescript
import { Hono } from 'hono';
import { requireAuth, optionalAuth } from '../middleware/auth';
import { db } from '../db/index';
import { uploads, likes } from '../db/schema';
import { eq, sql, and, desc, asc } from 'drizzle-orm';
import { uploadToS3, getS3Key, getThumbnailKey, deleteFromS3 } from '../services/storage';
import { processUpload, getMetadata } from '../services/image';
import { postToBluesky, loginWithAppPassword } from '../services/bluesky';
import { generateSessionId, setSession } from '../services/session';
import { sessions } from '../db/schema';
import { v4 as uuid } from 'uuid';

const uploadsRouter = new Hono();

function getUser(c: any) {
  return c.get('user');
}

uploadsRouter.get('/', optionalAuth, async (c) => {
  const sort = c.req.query('sort') || 'recent';
  const cursor = c.req.query('cursor');
  const limit = Math.min(parseInt(c.req.query('limit') || '20'), 50);

  let query = db.select({
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
    likeCount: sql<number>`(SELECT COUNT(*) FROM likes WHERE likes.upload_id = ${uploads.id})`,
  })
    .from(uploads)
    .where(eq(uploads.isPublic, true))
    .orderBy(sort === 'trending' ? desc(sql`likeCount`) : desc(uploads.createdAt))
    .limit(limit + 1);

  if (cursor) {
    query = query.where(sql`${uploads.id} < ${cursor}`);
  }

  const results = await query;
  const hasMore = results.length > limit;
  const items = hasMore ? results.slice(0, limit) : results;
  const nextCursor = hasMore ? items[items.length - 1].id : null;

  const user = c.get('user');
  if (user) {
    const uploadIds = items.map(i => i.id);
    const userLikes = await db.select({ uploadId: likes.uploadId })
      .from(likes)
      .where(and(
        eq(likes.userDid, user.did),
        sql`${likes.uploadId} IN ${uploadIds}`
      ));
    const likedSet = new Set(userLikes.map(l => l.uploadId));
    items.forEach(item => (item as any).hasLiked = likedSet.has(item.id));
  }

  return c.json({ items, cursor: nextCursor });
});

uploadsRouter.get('/:id', optionalAuth, async (c) => {
  const id = c.req.param('id');
  const upload = await db.query.uploads.findFirst({ where: eq(uploads.id, id) });
  if (!upload) return c.json({ error: 'Not Found', message: 'Upload not found' }, 404);
  if (!upload.isPublic) {
    const user = c.get('user');
    if (!user || user.did !== upload.userDid) {
      return c.json({ error: 'Not Found', message: 'Upload not found' }, 404);
    }
  }

  const likeCount = await db.select({ count: sql<number>`count(*)` }).from(likes).where(eq(likes.uploadId, id));
  const user = c.get('user');
  let hasLiked = false;
  if (user) {
    const like = await db.query.likes.findFirst({ where: and(eq(likes.uploadId, id), eq(likes.userDid, user.did)) });
    hasLiked = !!like;
  }

  return c.json({ ...upload, likeCount: likeCount[0].count, hasLiked });
});

uploadsRouter.post('/', requireAuth, async (c) => {
  const user = getUser(c);
  const body = await c.req.parseBody();
  const file = body['file'] as File;
  const title = body['title'] as string;
  const description = (body['description'] as string) || '';
  const isPublic = body['isPublic'] !== 'false';
  const shareToBluesky = body['shareToBluesky'] === 'true';
  const blueskyCaption = (body['blueskyCaption'] as string) || title;

  if (!file || !title) {
    return c.json({ error: 'Bad Request', message: 'file and title are required' }, 400);
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const processed = await processUpload(buffer);
  const uploadId = uuid();

  const s3Key = getS3Key(uploadId, file.name);
  const thumbKey = getThumbnailKey(uploadId);
  const url = await uploadToS3(s3Key, buffer, file.type);
  const thumbUrl = await uploadToS3(thumbKey, processed.thumbnail, 'image/webp');

  let blueskyPostUri: string | null = null;
  if (shareToBluesky) {
    try {
      const session = await db.query.sessions.findFirst({ where: eq(sessions.userDid, user.did) });
      if (session) {
        const agent = new BskyAgent({ service: process.env.BLUESKY_SERVICE! });
        agent.session = { did: session.userDid, accessJwt: session.accessToken, refreshJwt: session.refreshToken };
        blueskyPostUri = await postToBluesky(agent, blueskyCaption, url, title);
      }
    } catch (e) {
      console.error('Bluesky post failed:', e);
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
});

uploadsRouter.delete('/:id', requireAuth, async (c) => {
  const id = c.req.param('id');
  const user = getUser(c);
  const upload = await db.query.uploads.findFirst({ where: eq(uploads.id, id) });
  if (!upload) return c.json({ error: 'Not Found', message: 'Upload not found' }, 404);
  if (upload.userDid !== user.did) return c.json({ error: 'Forbidden', message: 'Not your upload' }, 403);

  await deleteFromS3(upload.s3Key);
  const thumbKey = getThumbnailKey(id);
  await deleteFromS3(thumbKey).catch(() => {});
  await db.delete(uploads).where(eq(uploads.id, id));

  return c.json({ deleted: true });
});

uploadsRouter.post('/:id/like', requireAuth, async (c) => {
  const id = c.req.param('id');
  const user = getUser(c);
  const existing = await db.query.likes.findFirst({ where: and(eq(likes.uploadId, id), eq(likes.userDid, user.did)) });
  if (existing) return c.json({ error: 'Conflict', message: 'Already liked' }, 409);

  await db.insert(likes).values({ uploadId: id, userDid: user.did });
  return c.json({ liked: true }, 201);
});

uploadsRouter.delete('/:id/like', requireAuth, async (c) => {
  const id = c.req.param('id');
  const user = getUser(c);
  await db.delete(likes).where(and(eq(likes.uploadId, id), eq(likes.userDid, user.did)));
  return c.json({ liked: false });
});

export default uploadsRouter;
```

- [ ] **Step 2: Create auth routes**

Create `api/src/routes/auth.ts`:

```typescript
import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth';
import { loginWithAppPassword } from '../services/bluesky';
import { generateSessionId, setSession, clearSession, getCurrentUser } from '../services/session';
import { db } from '../db/index';
import { sessions } from '../db/schema';
import { eq } from 'drizzle-orm';

const authRouter = new Hono();

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

    const sessionId = generateSessionId();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await db.insert(sessions).values({
      id: sessionId,
      userDid: agent.session?.did!,
      handle,
      displayName: profile.data.displayName || null,
      avatarUrl: profile.data.avatar || null,
      accessToken: agent.session?.accessJwt!,
      refreshToken: agent.session?.refreshJwt!,
      expiresAt,
    });

    setSession(c, sessionId, agent.session?.did!, handle, agent.session?.accessJwt!, agent.session?.refreshJwt!);

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
  const { getCookie } = await import('hono/cookie');
  const sessionId = getCookie(c, 'session');
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
```

- [ ] **Step 3: Create users routes**

Create `api/src/routes/users.ts`:

```typescript
import { Hono } from 'hono';
import { optionalAuth } from '../middleware/auth';
import { db } from '../db/index';
import { uploads, likes } from '../db/schema';
import { eq, sql } from 'drizzle-orm';

const usersRouter = new Hono();

usersRouter.get('/:did/uploads', optionalAuth, async (c) => {
  const did = c.req.param('did');
  const user = c.get('user');
  const isOwner = user && user.did === did;

  let query = db.select({
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
    .where(eq(uploads.userDid, did))
    .orderBy(sql`${uploads.createdAt} DESC`);

  if (!isOwner) {
    query = query.where(eq(uploads.isPublic, true));
  }

  const results = await query;

  if (user) {
    const uploadIds = results.map(i => i.id);
    const userLikes = await db.select({ uploadId: likes.uploadId })
      .from(likes)
      .where(sql`${likes.uploadId} IN ${uploadIds} AND ${likes.userDid} = ${user.did}`);
    const likedSet = new Set(userLikes.map(l => l.uploadId));
    results.forEach(item => (item as any).hasLiked = likedSet.has(item.id));
  }

  return c.json({ items: results });
});

export default usersRouter;
```

- [ ] **Step 4: Wire routes into index.ts**

Modify `api/src/index.ts`:

```typescript
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { uploadsRouter } from './routes/uploads'
import { authRouter } from './routes/auth'
import { usersRouter } from './routes/users'
import { validateEnv } from './validate-env'
import { runMigrations } from './db/index'

validateEnv()
runMigrations()

const app = new Hono()

app.use('*', logger())
app.use('*', cors({ origin: process.env.APP_URL || 'http://localhost:5173', credentials: true }))

app.route('/api/uploads', uploadsRouter)
app.route('/api/auth', authRouter)
app.route('/api/users', usersRouter)
app.get('/api/health', (c) => c.json({ ok: true }))

serve({
  fetch: app.fetch,
  port: parseInt(process.env.PORT || '3000')
}, (info) => {
  console.log(`Server running on http://localhost:${info.port}`)
})
```

- [ ] **Step 5: Add missing deps to api/package.json**

Add to dependencies: `"uuid": "^11.0.0"`, `"better-sqlite3": "^11.0.0"`, `"dotenv": "^16.0.0"`. Also add `"@types/better-sqlite3": "^7.6.0"` to devDependencies. Run `npm install`.

- [ ] **Step 6: Commit**

```bash
git add api/src/routes/ api/src/index.ts && git commit -m "feat: API routes for uploads, auth, and users"
```

---

## Task 5: Frontend API Client & Auth Store

**Files:**
- Create: `app/src/api/client.ts`
- Create: `app/src/stores/authStore.ts`
- Modify: `app/src/main.tsx`

- [ ] **Step 1: Create API client**

Create `app/src/api/client.ts`:

```typescript
const BASE = '/api';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    credentials: 'include',
  });
  const data = await res.json();
  if (!res.ok) throw { status: res.status, ...data };
  return data;
}

export const api = {
  getUploads: (params?: { sort?: string; cursor?: string; limit?: number }) => {
    const qs = new URLSearchParams(params as any).toString();
    return request<{ items: any[]; cursor: string | null }>(`/uploads${qs ? `?${qs}` : ''}`);
  },
  getUpload: (id: string) => request<any>(`/uploads/${id}`),
  upload: (form: FormData) => request<any>('/uploads', { method: 'POST', body: form }),
  deleteUpload: (id: string) => request<any>(`/uploads/${id}`, { method: 'DELETE' }),
  like: (id: string) => request<{ liked: boolean }>(`/uploads/${id}/like`, { method: 'POST' }),
  unlike: (id: string) => request<{ liked: boolean }>(`/uploads/${id}/like`, { method: 'DELETE' }),
  login: (handle: string, password: string) =>
    request<{ user: any }>('/auth/bluesky', { method: 'POST', body: new URLSearchParams({ handle, password }) }),
  logout: () => request<any>('/auth/logout', { method: 'POST' }),
  me: () => request<{ user: any }>('/auth/me'),
  getUserUploads: (did: string) => request<{ items: any[] }>(`/users/${did}/uploads`),
};
```

- [ ] **Step 2: Create auth store**

Create `app/src/stores/authStore.ts`:

```typescript
import { create } from 'zustand';
import { api } from '../api/client';

interface User {
  did: string;
  handle: string;
  displayName: string | null;
  avatarUrl: string | null;
}

interface AuthStore {
  user: User | null;
  loading: boolean;
  setUser: (u: User | null) => void;
  login: (handle: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  loading: false,
  setUser: (u) => set({ user: u }),
  login: async (handle, password) => {
    set({ loading: true });
    try {
      const { user } = await api.login(handle, password);
      set({ user, loading: false });
    } catch (e) {
      set({ loading: false });
      throw e;
    }
  },
  logout: async () => {
    await api.logout();
    set({ user: null });
  },
  checkAuth: async () => {
    try {
      const { user } = await api.me();
      set({ user });
    } catch {
      set({ user: null });
    }
  },
}));
```

- [ ] **Step 3: Update main.tsx**

Create `app/src/main.tsx`:

```typescript
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.tsx'

const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
```

- [ ] **Step 4: Commit**

```bash
git add app/src/api/ app/src/stores/ app/src/main.tsx && git commit -m "feat: frontend API client and auth store"
```

---

## Task 6: Frontend Components

**Files:**
- Create: `app/src/components/Navbar.tsx`
- Create: `app/src/components/ImageCard.tsx`
- Create: `app/src/components/ImageGrid.tsx`
- Create: `app/src/components/UploadDropzone.tsx`
- Create: `app/src/components/LikeButton.tsx`

- [ ] **Step 1: Create Navbar**

Create `app/src/components/Navbar.tsx`:

```typescript
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

export default function Navbar() {
  const { user, logout } = useAuthStore();
  const nav = useNavigate();

  return (
    <nav className="navbar">
      <Link to="/" className="logo">ImgurBSKY</Link>
      <div className="nav-links">
        {user ? (
          <>
            <Link to="/upload">Upload</Link>
            <Link to="/gallery">My Gallery</Link>
            <Link to={`/u/${user.did}`}>{user.displayName || user.handle}</Link>
            <button onClick={async () => { await logout(); nav('/'); }}>Logout</button>
          </>
        ) : (
          <Link to="/auth">Login with Bluesky</Link>
        )}
      </div>
    </nav>
  );
}
```

- [ ] **Step 2: Create ImageCard**

Create `app/src/components/ImageCard.tsx`:

```typescript
import { Link } from 'react-router-dom';
import LikeButton from './LikeButton';

interface ImageCardProps {
  upload: {
    id: string;
    title: string;
    thumbnailUrl: string;
    width: number;
    height: number;
    likeCount: number;
    hasLiked?: boolean;
    userDid: string;
    userHandle?: string;
  };
  onLike?: () => void;
}

export default function ImageCard({ upload, onLike }: ImageCardProps) {
  return (
    <div className="image-card">
      <Link to={`/i/${upload.id}`}>
        <img src={upload.thumbnailUrl} alt={upload.title} loading="lazy" />
      </Link>
      <div className="card-info">
        <Link to={`/i/${upload.id}`} className="card-title">{upload.title}</Link>
        <div className="card-meta">
          <LikeButton uploadId={upload.id} likeCount={upload.likeCount} hasLiked={upload.hasLiked} onLike={onLike} />
          <Link to={`/u/${upload.userDid}`} className="user-link">@{upload.userHandle}</Link>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create ImageGrid**

Create `app/src/components/ImageGrid.tsx`:

```typescript
import ImageCard from './ImageCard';

interface ImageGridProps {
  uploads: any[];
  onLike?: () => void;
}

export default function ImageGrid({ uploads, onLike }: ImageGridProps) {
  if (!uploads.length) return <p className="empty-state">No uploads yet. Be the first!</p>;

  return (
    <div className="image-grid">
      {uploads.map(u => <ImageCard key={u.id} upload={u} onLike={onLike} />)}
    </div>
  );
}
```

- [ ] **Step 4: Create UploadDropzone**

Create `app/src/components/UploadDropzone.tsx`:

```typescript
import { useState, useRef, useCallback } from 'react';

interface UploadDropzoneProps {
  onFile: (file: File) => void;
  file: File | null;
}

export default function UploadDropzone({ onFile, file }: UploadDropzoneProps) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith('image/')) onFile(f);
  }, [onFile]);

  return (
    <div
      className={`dropzone ${dragging ? 'dragging' : ''} ${file ? 'has-file' : ''}`}
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
      {file ? (
        <img src={URL.createObjectURL(file)} alt="Preview" className="preview-img" />
      ) : (
        <p>{dragging ? 'Drop it!' : 'Drag & drop an image or click to select'}</p>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Create LikeButton**

Create `app/src/components/LikeButton.tsx`:

```typescript
import { useAuthStore } from '../stores/authStore';
import { api } from '../api/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

interface LikeButtonProps {
  uploadId: string;
  likeCount: number;
  hasLiked: boolean;
  onLike?: () => void;
}

export default function LikeButton({ uploadId, likeCount, hasLiked, onLike }: LikeButtonProps) {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const nav = useNavigate();

  const mutation = useMutation({
    mutationFn: () => hasLiked ? api.unlike(uploadId) : api.like(uploadId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['uploads'] });
      qc.invalidateQueries({ queryKey: ['upload', uploadId] });
      onLike?.();
    },
  });

  if (!user) {
    return (
      <button className="like-btn" onClick={() => nav('/auth')} title="Login to like">
        ♡ {likeCount}
      </button>
    );
  }

  return (
    <button
      className={`like-btn ${hasLiked ? 'liked' : ''}`}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); mutation.mutate(); }}
      disabled={mutation.isPending}
    >
      {hasLiked ? '♥' : '♡'} {likeCount}
    </button>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add app/src/components/ app/src/App.tsx app/src/App.css app/src/index.css && git commit -m "feat: frontend components — Navbar, ImageCard, ImageGrid, UploadDropzone, LikeButton"
```

---

## Task 7: Frontend Pages

**Files:**
- Create: `app/src/pages/Home.tsx`
- Create: `app/src/pages/Upload.tsx`
- Create: `app/src/pages/ImageView.tsx`
- Create: `app/src/pages/Auth.tsx`
- Create: `app/src/pages/Gallery.tsx`
- Create: `app/src/pages/Profile.tsx`
- Modify: `app/src/App.tsx`

- [ ] **Step 1: Create Home page**

Create `app/src/pages/Home.tsx`:

```typescript
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import ImageGrid from '../components/ImageGrid';
import { api } from '../api/client';
import { useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';

export default function Home() {
  const [search, setSearch] = useSearchParams();
  const sort = search.get('sort') || 'recent';
  const { checkAuth } = useAuthStore();

  useEffect(() => { checkAuth(); }, []);

  const { data, fetchNextPage, hasNextPage } = useQuery({
    queryKey: ['uploads', sort],
    queryFn: () => api.getUploads({ sort, limit: 20 }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.cursor,
  });

  return (
    <div className="home-page">
      <div className="sort-bar">
        <span>Sort:</span>
        <button className={sort === 'recent' ? 'active' : ''} onClick={() => setSearch({ sort: 'recent' })}>Recent</button>
        <button className={sort === 'trending' ? 'active' : ''} onClick={() => setSearch({ sort: 'trending' })}>Trending</button>
      </div>
      <ImageGrid uploads={data?.items || []} />
      {hasNextPage && <button onClick={() => fetchNextPage()}>Load More</button>}
    </div>
  );
}
```

- [ ] **Step 2: Create Upload page**

Create `app/src/pages/Upload.tsx`:

```typescript
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { api } from '../api/client';
import UploadDropzone from '../components/UploadDropzone';
import { useAuthStore } from '../stores/authStore';

export default function Upload() {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [shareToBluesky, setShareToBluesky] = useState(false);
  const [blueskyCaption, setBlueskyCaption] = useState('');
  const nav = useNavigate();
  const { user } = useAuthStore();

  const mutation = useMutation({
    mutationFn: () => {
      const form = new FormData();
      form.append('file', file!);
      form.append('title', title);
      form.append('description', description);
      form.append('isPublic', String(isPublic));
      form.append('shareToBluesky', String(shareToBluesky));
      if (shareToBluesky) form.append('blueskyCaption', blueskyCaption || title);
      return api.upload(form);
    },
    onSuccess: (data: any) => nav(`/i/${data.id}`),
  });

  if (!user) {
    return <p>Please <a href="/auth">login</a> to upload.</p>;
  }

  return (
    <div className="upload-page">
      <h1>Upload Image</h1>
      <UploadDropzone onFile={setFile} file={file} />
      <input placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} />
      <textarea placeholder="Description (optional)" value={description} onChange={e => setDescription(e.target.value)} />
      <label>
        <input type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} />
        Public (visible in gallery)
      </label>
      <label>
        <input type="checkbox" checked={shareToBluesky} onChange={e => setShareToBluesky(e.target.checked)} />
        Also post to Bluesky
      </label>
      {shareToBluesky && (
        <input placeholder="Bluesky caption" value={blueskyCaption} onChange={e => setBlueskyCaption(e.target.value)} />
      )}
      <button onClick={() => mutation.mutate()} disabled={!file || !title || mutation.isPending}>
        {mutation.isPending ? 'Uploading...' : 'Upload'}
      </button>
      {mutation.isError && <p className="error">Upload failed. Try again.</p>}
    </div>
  );
}
```

- [ ] **Step 3: Create ImageView page**

Create `app/src/pages/ImageView.tsx`:

```typescript
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { useAuthStore } from '../stores/authStore';

export default function ImageView() {
  const { id } = useParams();
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const nav = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['upload', id],
    queryFn: () => api.getUpload(id!),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteUpload(id!),
    onSuccess: () => nav('/gallery'),
  });

  if (isLoading) return <p>Loading...</p>;
  if (!data) return <p>Not found.</p>;

  const copyLink = () => navigator.clipboard.writeText(`${window.location.origin}/i/${id}`);

  return (
    <div className="image-view">
      <img src={data.url} alt={data.title} style={{ maxWidth: '100%' }} />
      <h1>{data.title}</h1>
      {data.description && <p>{data.description}</p>}
      <Link to={`/u/${data.userDid}`}>@{data.userHandle || data.userDid}</Link>
      <div className="actions">
        <button onClick={copyLink}>Copy Link</button>
        {user?.did === data.userDid && (
          <button onClick={() => deleteMutation.mutate()} className="danger">Delete</button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create Auth page**

Create `app/src/pages/Auth.tsx`:

```typescript
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

export default function Auth() {
  const [handle, setHandle] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, loading } = useAuthStore();
  const nav = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(handle, password);
      nav('/gallery');
    } catch (e: any) {
      setError(e.message || 'Login failed. Check your credentials.');
    }
  };

  return (
    <div className="auth-page">
      <h1>Login with Bluesky</h1>
      <form onSubmit={handleSubmit}>
        <input placeholder="handle.bsky.social" value={handle} onChange={e => setHandle(e.target.value)} required />
        <input type="password" placeholder="App Password" value={password} onChange={e => setPassword(e.target.value)} required />
        <button type="submit" disabled={loading}>{loading ? 'Logging in...' : 'Login'}</button>
      </form>
      {error && <p className="error">{error}</p>}
      <p className="hint">
        Need an app password? <a href="https://bsky.app/settings/app-passwords" target="_blank" rel="noreferrer">Create one at bsky.app</a>
      </p>
    </div>
  );
}
```

- [ ] **Step 5: Create Gallery page**

Create `app/src/pages/Gallery.tsx`:

```typescript
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import ImageGrid from '../components/ImageGrid';
import { useAuthStore } from '../stores/authStore';

export default function Gallery() {
  const { user, checkAuth } = useAuthStore();
  const nav = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (!user) nav('/auth');
  }, [user]);

  const { data } = useQuery({
    queryKey: ['gallery', user?.did],
    queryFn: () => api.getUserUploads(user!.did),
    enabled: !!user,
  });

  return (
    <div className="gallery-page">
      <h1>My Gallery</h1>
      <ImageGrid uploads={data?.items || []} />
    </div>
  );
}
```

- [ ] **Step 6: Create Profile page**

Create `app/src/pages/Profile.tsx`:

```typescript
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import ImageGrid from '../components/ImageGrid';

export default function Profile() {
  const { did } = useParams();
  const { data } = useQuery({
    queryKey: ['profile', did],
    queryFn: () => api.getUserUploads(did!),
  });

  return (
    <div className="profile-page">
      <h1>{did}</h1>
      <ImageGrid uploads={data?.items || []} />
    </div>
  );
}
```

- [ ] **Step 7: Update App.tsx**

Create `app/src/App.tsx`:

```typescript
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Upload from './pages/Upload';
import ImageView from './pages/ImageView';
import Auth from './pages/Auth';
import Gallery from './pages/Gallery';
import Profile from './pages/Profile';

export default function App() {
  return (
    <>
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/i/:id" element={<ImageView />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/u/:did" element={<Profile />} />
        </Routes>
      </main>
    </>
  );
}
```

- [ ] **Step 8: Add basic styles**

Update `app/src/index.css` with minimal grid and layout styles:

```css
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: system-ui, sans-serif; background: #f5f5f5; color: #333; }

.navbar { display: flex; justify-content: space-between; padding: 1rem 2rem; background: #fff; border-bottom: 1px solid #ddd; align-items: center; }
.navbar .logo { font-weight: bold; font-size: 1.2rem; text-decoration: none; color: #333; }
.nav-links { display: flex; gap: 1rem; align-items: center; }
.nav-links a, .nav-links button { text-decoration: none; color: #555; font-size: 0.9rem; background: none; border: none; cursor: pointer; }

.image-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 1rem; padding: 1rem 2rem; }
.image-card { background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
.image-card img { width: 100%; height: 200px; object-fit: cover; display: block; }
.card-info { padding: 0.75rem; }
.card-title { display: block; font-weight: 500; margin-bottom: 0.5rem; text-decoration: none; color: #333; }
.card-meta { display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem; color: #666; }
.user-link { color: #666; text-decoration: none; }

.like-btn { background: none; border: none; cursor: pointer; font-size: 1rem; color: #888; }
.like-btn.liked { color: #e24; }
.like-btn:hover { color: #e24; }

.dropzone { border: 2px dashed #ccc; border-radius: 8px; padding: 3rem; text-align: center; cursor: pointer; background: #fafafa; transition: background 0.2s; }
.dropzone.dragging { background: #e8f0ff; border-color: #69f; }
.dropzone.has-file { padding: 1rem; }
.dropzone .preview-img { max-width: 100%; max-height: 300px; margin: auto; display: block; }

.upload-page, .auth-page, .gallery-page, .home-page { max-width: 800px; margin: 0 auto; padding: 2rem; display: flex; flex-direction: column; gap: 1rem; }
.upload-page input, .upload-page textarea, .auth-page input { padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px; width: 100%; font-size: 1rem; }
.upload-page button, .auth-page button { padding: 0.75rem 1.5rem; background: #3a7bd5; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-size: 1rem; }
.upload-page button:disabled, .auth-page button:disabled { background: #ccc; }

.sort-bar { display: flex; gap: 0.5rem; align-items: center; padding: 0.5rem 2rem; }
.sort-bar button { padding: 0.4rem 0.8rem; border: 1px solid #ddd; background: #fff; border-radius: 4px; cursor: pointer; }
.sort-bar button.active { background: #3a7bd5; color: #fff; border-color: #3a7bd5; }

.image-view { max-width: 900px; margin: 0 auto; padding: 2rem; }
.image-view img { width: 100%; border-radius: 8px; }
.image-view h1 { margin: 1rem 0 0.5rem; }
.image-view .actions { display: flex; gap: 1rem; margin-top: 1rem; }
.image-view .actions button { padding: 0.5rem 1rem; border: 1px solid #ddd; background: #fff; border-radius: 4px; cursor: pointer; }
.image-view .actions button.danger { color: #c33; border-color: #c33; }
.error { color: #c33; }
.empty-state { text-align: center; padding: 3rem; color: #888; }
```

- [ ] **Step 9: Commit**

```bash
git add app/src/pages/ app/src/App.tsx app/src/index.css && git commit -m "feat: frontend pages — Home, Upload, ImageView, Auth, Gallery, Profile"
```

---

## Task 8: Root Package & Dev Scripts

**Files:**
- Create: `package.json` (root)
- Create: `package-lock.json`
- Create: `.gitignore`
- Modify: `README.md`

- [ ] **Step 1: Create root package.json**

Create `package.json` at root:

```json
{
  "name": "imgur-bluesky-app",
  "private": true,
  "workspaces": ["api", "app"],
  "scripts": {
    "dev": "concurrently \"npm run dev --workspace=api\" \"npm run dev --workspace=app\"",
    "dev:api": "npm run dev --workspace=api",
    "dev:app": "npm run dev --workspace=app",
    "build": "npm run build --workspace=api && npm run build --workspace=app"
  },
  "devDependencies": {
    "concurrently": "^9.0.0"
  }
}
```

- [ ] **Step 2: Update .gitignore**

Update `.gitignore` at root:

```
node_modules/
data.db
.env
dist/
```

- [ ] **Step 3: Install concurrently and commit**

Run: `npm install` from root. Then:

```bash
git add package.json package-lock.json .gitignore README.md && git commit -m "feat: root workspace with dev scripts"
```

---

## Spec Coverage Checklist

| Spec Section | Task |
|---|---|
| Monorepo structure | Task 1, Task 8 |
| S3 storage + image processing | Task 2 |
| Bluesky auth (app password) | Task 3, Task 4 |
| Upload API + S3 | Task 4 |
| Public feed + sort | Task 4 |
| Single image page | Task 7 |
| Like system | Task 4, Task 6 |
| My Gallery page | Task 7 |
| User profile page | Task 7 |
| Privacy model (isPublic flag) | Task 4, Task 7 |
| shareToBluesky flow | Task 4, Task 7 |
| Environment variables | Task 1 |
| Database schema | Task 1 |

All spec items covered. No gaps.
