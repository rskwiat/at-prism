# API Testing Guide

## Setup

1. Start the server:
   ```bash
   npm run dev
   ```

2. Base URL: `http://localhost:3000`

## Test Endpoints

### 1. Health Check
```bash
curl http://localhost:3000/api/health
```

### 2. Get Public Uploads
```bash
curl http://localhost:3000/api/uploads
```

### 3. Bluesky Login
```bash
curl -X POST http://localhost:3000/api/auth/bluesky \
  -d "handle=YOUR_HANDLE.bsky.social" \
  -d "password=YOUR_APP_PASSWORD" \
  -c cookies.txt
```

### 4. Get Current User (requires auth)
```bash
curl http://localhost:3000/api/auth/me -b cookies.txt
```

### 5. Upload Image (requires auth)
```bash
curl -X POST http://localhost:3000/api/uploads \
  -b cookies.txt \
  -F "title=My Image" \
  -F "description=A test image" \
  -F "file=@/path/to/image.jpg"
```

### 6. Like Upload (requires auth)
```bash
curl -X POST http://localhost:3000/api/uploads/UPLOAD_ID/like -b cookies.txt
```

### 7. Get User Profile
```bash
curl http://localhost:3000/api/users/DID
```

### 8. Get User Uploads
```bash
curl http://localhost:3000/api/users/DID/uploads
```

### 9. Logout (requires auth)
```bash
curl -X POST http://localhost:3000/api/auth/logout -b cookies.txt
```

## Bruno Collection

Import `tests/api.json` into Bruno/Postman for a pre-built collection.

## Required Env Variables

Create `api/.env` with:
```
DATABASE_URL=file:./data.db
S3_ENDPOINT=https://your-r2-endpoint.r2.cloudflarestorage.com
S3_REGION=auto
S3_BUCKET=your-bucket
S3_ACCESS_KEY_ID=your-key
S3_SECRET_ACCESS_KEY=your-secret
APP_URL=http://localhost:3000
SESSION_SECRET=random-string
BLUESKY_SERVICE=https://bsky.social
```