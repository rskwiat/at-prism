import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION || 'auto',
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

  const endpoint = process.env.S3_ENDPOINT!.replace('https://', '');
  return `https://${BUCKET}.${endpoint}/${key}`;
}

export async function deleteFromS3(key: string): Promise<void> {
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

export function getUploadKey(uploadId: string, filename: string): string {
  const ext = filename.split('.').pop() || 'jpg';
  return `uploads/${uploadId}/original.${ext}`;
}

export function getThumbnailKey(uploadId: string): string {
  return `uploads/${uploadId}/thumbnail.webp`;
}