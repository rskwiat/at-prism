import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { mkdir, writeFile, unlink, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

const UPLOAD_DIR = join(process.cwd(), 'uploads');

const useR2 = process.env.S3_ACCESS_KEY_ID && 
  process.env.S3_ACCESS_KEY_ID !== 'your-access-key' &&
  process.env.S3_ENDPOINT?.includes('r2');

let s3: S3Client | null = null;
let bucket = '';

if (useR2) {
  s3 = new S3Client({
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION || 'auto',
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID!,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
    },
    forcePathStyle: true,
  });
  bucket = process.env.S3_BUCKET!;
}

async function ensureUploadDir() {
  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true });
  }
}

export async function uploadToS3(key: string, body: Buffer, contentType: string): Promise<string> {
  if (useR2 && s3) {
    await s3.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }));
    const endpoint = process.env.S3_ENDPOINT!.replace('https://', '');
    return `https://${bucket}.${endpoint}/${key}`;
  }

  await ensureUploadDir();
  const filePath = join(UPLOAD_DIR, key);
  const dir = join(UPLOAD_DIR, key.split('/').slice(0, -1).join('/'));
  await mkdir(dir, { recursive: true });
  await writeFile(filePath, body);
  return `/uploads/${key}`;
}

export async function deleteFromS3(key: string): Promise<void> {
  if (useR2 && s3) {
    await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    return;
  }

  const filePath = join(UPLOAD_DIR, key);
  try {
    await unlink(filePath);
  } catch {}
}

export function getUploadKey(uploadId: string, filename: string): string {
  const ext = filename.split('.').pop() || 'jpg';
  return `uploads/${uploadId}/original.${ext}`;
}

export function getThumbnailKey(uploadId: string): string {
  return `uploads/${uploadId}/thumbnail.webp`;
}

export function serveStatic(path: string): Promise<Buffer | null> {
  return readFile(join(UPLOAD_DIR, path)).catch(() => null);
}