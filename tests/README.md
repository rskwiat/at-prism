# API Testing with Curl

## Start the server
```bash
cd api && npm run dev
```

## Test the API

### 1. Health Check
```bash
curl http://localhost:3000/api/health
```

### 2. Get Public Uploads
```bash
curl http://localhost:3000/api/uploads
```

### 3. Login with Bluesky (replace YOUR_HANDLE and YOUR_APP_PASSWORD)
```bash
curl -X POST http://localhost:3000/api/auth/bluesky \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "handle=YOUR_HANDLE.bsky.social&password=YOUR_APP_PASSWORD" \
  -c cookies.txt -v
```

### 4. Get Current User (after login)
```bash
curl http://localhost:3000/api/auth/me -b cookies.txt
```

### 5. Upload Image (after login)
```bash
curl -X POST http://localhost:3000/api/uploads \
  -b cookies.txt \
  -F "title=Test Image" \
  -F "description=Testing upload" \
  -F "isPublic=true" \
  -F "file=@/path/to/your-image.jpg"
```

### 6. Like an Upload (replace UPLOAD_ID)
```bash
curl -X POST http://localhost:3000/api/uploads/UPLOAD_ID/like -b cookies.txt
```

### 7. Get User Profile (replace DID)
```bash
curl http://localhost:3000/api/users/did:plc:XXX
```

### 8. Get User Uploads (replace DID)
```bash
curl http://localhost:3000/api/users/did:plc:XXX/uploads
```

### 9. Logout
```bash
curl -X POST http://localhost:3000/api/auth/logout -b cookies.txt
```

## Create an App Password
1. Go to https://bsky.app/settings/app-passwords
2. Click "Add app password"
3. Give it a name (e.g., "Imgur Bluesky API")
4. Use that password in the login request above