import 'dotenv/config';
const required = ['DATABASE_URL', 'S3_ENDPOINT', 'S3_REGION', 'S3_BUCKET', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY', 'APP_URL', 'SESSION_SECRET', 'BLUESKY_SERVICE'];
export function validateEnv() {
    const missing = required.filter(k => !process.env[k]);
    if (missing.length) {
        throw new Error(`Missing required env vars: ${missing.join(', ')}`);
    }
}
