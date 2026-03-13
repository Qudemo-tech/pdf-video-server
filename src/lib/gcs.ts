import { Storage } from '@google-cloud/storage';

let _bucket: ReturnType<Storage['bucket']> | null = null;

function getBucket() {
  if (_bucket) return _bucket;

  const bucketName = process.env.GCS_BUCKET_NAME || 'pdftovideo';
  const storageOptions: { keyFilename?: string } = {};
  if (process.env.GCS_KEY_FILE) {
    storageOptions.keyFilename = process.env.GCS_KEY_FILE;
  }
  console.log('[GCS] Initializing with bucket:', bucketName, '| keyFile:', process.env.GCS_KEY_FILE || '(using ADC)');
  _bucket = new Storage(storageOptions).bucket(bucketName);
  return _bucket;
}

/**
 * Upload a Buffer to GCS. Returns the public URL.
 */
export async function uploadBufferToGCS(buffer: Buffer, destination: string, contentType: string): Promise<string> {
  console.log('[GCS] Uploading buffer to:', destination);
  const file = getBucket().file(destination);
  await file.save(buffer, {
    metadata: { contentType },
    resumable: false,
  });
  const url = getPublicUrl(destination);
  console.log('[GCS] Buffer upload success:', url);
  return url;
}

/**
 * Upload a local file to GCS. Returns the public URL.
 */
export async function uploadFileToGCS(localPath: string, destination: string, contentType: string): Promise<string> {
  console.log('[GCS] Uploading file to:', destination, '| from:', localPath);
  await getBucket().upload(localPath, {
    destination,
    metadata: { contentType },
    resumable: false,
  });
  const url = getPublicUrl(destination);
  console.log('[GCS] File upload success:', url);
  return url;
}

export function getPublicUrl(destination: string): string {
  const bucketName = process.env.GCS_BUCKET_NAME || 'pdftovideo';
  return `https://storage.googleapis.com/${bucketName}/${destination}`;
}

/**
 * Generate a signed URL for a GCS object given its public URL.
 * The signed URL grants temporary read access without requiring bucket-level public permissions.
 */
export async function generateSignedUrl(publicUrl: string, expiresInDays = 7): Promise<string> {
  const bucketName = process.env.GCS_BUCKET_NAME || 'pdftovideo';
  const prefix = `https://storage.googleapis.com/${bucketName}/`;

  if (!publicUrl.startsWith(prefix)) {
    console.warn('[GCS] URL does not match expected bucket prefix, returning as-is:', publicUrl);
    return publicUrl;
  }

  const objectPath = publicUrl.slice(prefix.length);
  const file = getBucket().file(objectPath);

  const [signedUrl] = await file.getSignedUrl({
    version: 'v4',
    action: 'read',
    expires: Date.now() + expiresInDays * 24 * 60 * 60 * 1000,
  });

  console.log('[GCS] Generated signed URL for:', objectPath, '| expires in', expiresInDays, 'days');
  return signedUrl;
}
