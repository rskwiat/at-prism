# Rate Limiting Design

## Overview

Add rate limiting to login and upload endpoints to prevent abuse.

## Endpoints

### Login Endpoint (`POST /auth/bluesky`)
- Limit: 1 request per minute, 5 requests per hour per handle
- Track by: Bluesky handle (identifier)

### Upload Endpoint (`POST /uploads`)
- Limit: 1 request per minute, 10 requests per hour per authenticated user
- Track by: User DID from session

## Implementation

### Storage
- In-memory `Map` with timestamp arrays
- No persistence (counters reset on server restart)
- Manual cleanup of expired entries on each check

### Response
- HTTP 429 Too Many Requests
- JSON body: `{ "error": "Too Many Requests", "message": "Rate limit exceeded. Try again later." }`
- No `Retry-After` header required

### File Structure
- Create `api/src/middleware/rate-limit.ts` with rate limiter class
- Apply middleware to:
  - `api/src/routes/auth.ts` - login route
  - `api/src/routes/uploads.ts` - upload route