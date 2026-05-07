# Imgur-Bluesky App — Design Specification

**Date:** 2026-05-07
**Status:** Draft

---

## Overview

A photo-sharing platform built on the Bluesky protocol. Users authenticate with their Bluesky account, upload images, and optionally cross-post to Bluesky. The public gallery is browseable by anyone, with likes tied to Bluesky identity.

---

## Architecture

### Monorepo Structure

```
imgur-bluesky-app/
├── api/           # Hono backend, REST API-first
├── app/           # Vite + React frontend (API client)
└── docs/          # Specs, plans
```

The frontend is just another API client — the backend is designed to support future mobile apps or third-party integrations from day one.

### Storage

S3-compatible storage (Cloudflare R2, AWS S3, or compatible). The server handles upload → S3 → returns URL. Original files stored as blobs.

### Database

SQLite with Drizzle ORM for schema management and queries. Chosen for zero-ops simplicity and portability. Schema can be ported to Postgres later.

### Image Processing

Sharp (Node.js) for server-side processing:
- Resize large images (max dimension configurable)
- Generate thumbnails (e.g., 400px wide)
- Optimize/compress (WebP output where supported)

### Authentication

Bluesky identity is the single auth system:

1. **App Password** — User provides their Bluesky app password. Server stores encrypted credentials, uses `com.atproto` SDK to post on their behalf. Simpler to implement for MVP.
2. **OAuth** — Full Bluesky OAuth flow. Supported as a future enhancement.

Sessions stored via HTTP-only cookies.

### Bluesky Integration

The app uses `@atproto/api` (official SDK) for:
- Session management (app password auth)
- Creating posts with image embeds
- Resolving handles to DIDs

When a user opts to share to Bluesky:
1. Fetch upload URL from S3
2. Create a Bluesky post with the image embedded as an external link card (or direct image embed)
3. Store the Bluesky post URI in the upload record for reference

### API Design

All endpoints under `/api/`. Authentication via session cookie.

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/uploads` | Create upload | Required |
| GET | `/api/uploads` | Public feed (`?sort=recent\|trending`) | None |
| GET | `/api/uploads/:id` | Single upload | None |
| DELETE | `/api/uploads/:id` | Delete own upload | Owner only |
| POST | `/api/uploads/:id/like` | Like | Required |
| DELETE | `/api/uploads/:id/like` | Unlike | Required |
| GET | `/api/auth/bluesky` | Initiate auth (app password form) | None |
| POST | `/api/auth/bluesky` | Submit credentials, create session | None |
| POST | `/api/auth/logout` | Clear session | Required |
| GET | `/api/me` | Current user profile | Required |
| GET | `/api/users/:did/uploads` | User's upload gallery | None (public), Extended for owner |

### Data Models

#### Upload

```typescript
{
  id: string;            // UUID
  userDid: string;       // Bluesky DID
  title: string;
  description: string;
  s3Key: string;         // S3 object key
  url: string;           // Public URL
  thumbnailUrl: string;
  mimeType: string;
  sizeBytes: number;
  width: number;
  height: number;
  isPublic: boolean;     // false = hidden from gallery
  isListed: boolean;     // false = hidden from user profile too
  blueskyPostUri?: string;
  createdAt: Date;
}
```

#### Like

```typescript
{
  uploadId: string;
  userDid: string;
  createdAt: Date;
}
```

#### User (session/cache)

```typescript
{
  did: string;
  handle: string;
  displayName?: string;
  avatarUrl?: string;
  createdAt: Date;
}
```

### Request/Response Shapes

#### POST /api/uploads

**Request:** `multipart/form-data`
- `file` — image binary (required)
- `title` — string (required)
- `description` — string (optional)
- `isPublic` — boolean (default: true)
- `shareToBluesky` — boolean (default: false)
- `blueskyCaption` — string (optional, used if shareToBluesky is true)

**Response (201):**
```json
{
  "id": "uuid",
  "title": "...",
  "url": "https://...",
  "thumbnailUrl": "https://...",
  "isPublic": true,
  "blueskyPostUri": null,
  "createdAt": "2026-05-07T..."
}
```

#### GET /api/uploads

**Query params:**
- `sort` — `recent` (default) | `trending`
- `cursor` — pagination cursor (opaque string)
- `limit` — page size (default: 20, max: 50)

**Response (200):**
```json
{
  "uploads": [...],
  "cursor": "opaque-next-cursor"
}
```

#### POST /api/uploads/:id/like

**Response (201):**
```json
{ "liked": true }
```

#### GET /api/auth/bluesky

**Response:** HTML page with login form (app password input + Bluesky handle)

---

## Frontend Pages

| Route | Description |
|-------|-------------|
| `/` | Public gallery with sort toggle (recent/trending) |
| `/upload` | Upload form with drag-and-drop |
| `/i/:id` | Single image view |
| `/auth` | Bluesky login page |
| `/gallery` | My uploads (auth required) |
| `/u/:did` | Public user profile + uploads |

### Public Gallery (`/`)

- Masonry or grid layout of images
- Sort toggle: Recent | Trending
- Infinite scroll pagination
- Each card shows: image thumbnail, title, like count, uploader handle
- Click card → `/i/:id`

### Upload Page (`/upload`)

- Drag-and-drop zone or file picker
- Title field (required)
- Description field (optional)
- "Hide from public gallery" checkbox (defaults to public)
- "Also post to Bluesky" checkbox (shown only when logged in)
  - If checked: caption field appears
  - Preview of how the post will look
- Submit button → loading state → redirect to image page

### Single Image (`/i/:id`)

- Full image display
- Title, description, uploader link
- Like button (disabled if not logged in, shows tooltip)
- Like count
- Share buttons (copy link, share to Bluesky manually)
- Delete button (shown only to owner)

### Auth Page (`/auth`)

- Bluesky handle input + app password input
- Link to Bluesky app password creation instructions
- Error messages for invalid credentials
- Note about OAuth coming soon (if applicable)

### Gallery (`/gallery`)

- Grid of user's uploads
- Toggle: All / Visible in gallery / Hidden
- Each item has edit (visibility) and delete options
- Empty state with CTA to upload

### User Profile (`/u/:did`)

- User avatar, display name, handle
- Grid of public uploads only
- Empty state if no public uploads

---

## Privacy Model

- Uploads default to **public** (`isPublic: true`)
- If `isPublic: false`, upload only appears in `/gallery` (owner's private view)
- User profile (`/u/:did`) only shows public uploads
- Like counts are publicly visible; like action requires auth

---

## Voting / Likes

- One like per user per upload (unique constraint)
- Like count visible to everyone
- Like action requires auth
- Anonymous browsers see count but cannot like
- Trending sort: uploads with most likes in last 24-48 hours rank higher

---

## Environment Variables

```env
# Database
DATABASE_URL=file:./data.db

# S3 Storage
S3_ENDPOINT=https://...
S3_REGION=us-east-1
S3_BUCKET=imgur-uploads
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...

# App
APP_URL=https://yourapp.com
SESSION_SECRET=...

# Bluesky
BLUESKY_SERVICE=https://bsky.social
```

---

## Project Phases

### Phase 1 — MVP

1. Database schema + Drizzle setup
2. S3 upload integration (basic)
3. Image processing (resize + thumbnail)
4. Upload API + frontend upload page
5. Public gallery feed
6. Single image page
7. Bluesky app password auth
8. Like system
9. My Gallery page
10. User profile page

### Phase 2

1. OAuth flow
2. Tagging system
3. Search (title/description)
4. Comments

### Phase 3

1. Mobile API polish
2. Rate limiting
3. Admin moderation panel
