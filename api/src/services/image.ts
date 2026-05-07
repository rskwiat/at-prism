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