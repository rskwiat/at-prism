# Imgur-Bluesky App

A photo-sharing platform built on the Bluesky protocol. Users authenticate with their Bluesky account, upload images, and optionally cross-post to Bluesky.

## Quick Start

```bash
npm install
npm run dev
```

- **Frontend**: http://localhost:5173
- **API**: http://localhost:3000

## Architecture

```
imgur-bluesky-app/
├── api/           # Hono backend (REST API)
├── app/           # Vite + React frontend
└── docs/          # Specs and design docs
```

- **Backend**: Hono (Node.js) with SQLite + Drizzle ORM
- **Storage**: S3-compatible (Cloudflare R2, AWS S3)
- **Auth**: Bluesky app password authentication
- **Image Processing**: Sharp (resize, thumbnail, WebP)

## Features

- Upload images with title/description
- Public gallery with recent/trending sort
- Like system (Bluesky identity required)
- Optional cross-post to Bluesky
- User gallery (manage your uploads)
- Public user profiles

## Project Phases

### Phase 1 — MVP
- Database + S3 upload + image processing
- Upload API + frontend
- Public gallery
- Bluesky auth + like system
- User gallery + profiles

### Phase 2
- OAuth flow
- Tagging + search
- Comments

### Phase 3
- Mobile API polish
- Rate limiting
- Admin moderation