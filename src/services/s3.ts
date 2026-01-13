import type { S3Item } from '../types';

const S3_BACKEND_URL = import.meta.env.VITE_S3_BACKEND_URL || 'http://localhost:3001/api/s3';
const AWS_BUCKET_NAME = import.meta.env.VITE_AWS_BUCKET_NAME || 'sde-audit-images-bucket';

interface PresignedUrlResponse {
  url: string;
  expiresAt: number;
}

interface S3ListResponse {
  items: Array<{
    key: string;
    lastModified: string;
    size: number;
  }>;
}

// Cache for presigned URLs (expires after 50 minutes to be safe)
const urlCache = new Map<string, { url: string; expiresAt: number }>();
const URL_CACHE_TTL = 50 * 60 * 1000; // 50 minutes

/**
 * Get a presigned URL for an S3 object via the backend
 */
export async function getPresignedUrl(key: string): Promise<string> {
  // Check cache first
  const cached = urlCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.url;
  }

  try {
    const response = await fetch(`${S3_BACKEND_URL}/presigned`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        bucket: AWS_BUCKET_NAME,
        key,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to get presigned URL: ${response.statusText}`);
    }

    const data: PresignedUrlResponse = await response.json();

    // Cache the URL
    urlCache.set(key, {
      url: data.url,
      expiresAt: Date.now() + URL_CACHE_TTL,
    });

    return data.url;
  } catch (error) {
    console.error(`Error getting presigned URL for ${key}:`, error);
    throw error;
  }
}

/**
 * List objects in an S3 prefix via the backend
 */
export async function listObjects(prefix: string): Promise<S3ListResponse> {
  try {
    const response = await fetch(`${S3_BACKEND_URL}/list`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        bucket: AWS_BUCKET_NAME,
        prefix,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to list S3 objects: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error listing S3 objects for prefix ${prefix}:`, error);
    throw error;
  }
}

/**
 * Fetch all images and files for an audit from S3
 */
export async function fetchAuditFiles(auditId: string, buildingId: string): Promise<{
  images: S3Item[];
  files: S3Item[];
}> {
  try {
    // The S3 prefix pattern for audit files: {auditId}_ (images stored at bucket root)
    const prefix = `${auditId}_`;

    const listResponse = await listObjects(prefix);

    const images: S3Item[] = [];
    const files: S3Item[] = [];

    // Process each item and get presigned URLs
    await Promise.all(
      listResponse.items.map(async (item) => {
        const key = item.key;
        const name = key.split('/').pop() || key;
        const lowerName = name.toLowerCase();

        try {
          const url = await getPresignedUrl(key);
          const s3Item: S3Item = { name, url, key };

          // Categorize by file type
          if (
            lowerName.endsWith('.jpg') ||
            lowerName.endsWith('.jpeg') ||
            lowerName.endsWith('.png') ||
            lowerName.endsWith('.gif') ||
            lowerName.endsWith('.webp')
          ) {
            images.push(s3Item);
          } else {
            files.push(s3Item);
          }
        } catch {
          console.warn(`Failed to get URL for ${key}, skipping`);
        }
      })
    );

    // Sort images by name (numeric sorting for numbered images)
    images.sort((a, b) => {
      const numA = parseInt(a.name.match(/\d+/)?.[0] || '0', 10);
      const numB = parseInt(b.name.match(/\d+/)?.[0] || '0', 10);
      return numA - numB;
    });

    return { images, files };
  } catch (error) {
    console.error('Error fetching audit files:', error);
    return { images: [], files: [] };
  }
}

/**
 * Clear the URL cache
 */
export function clearUrlCache(): void {
  urlCache.clear();
}

/**
 * Get image as base64 data URL via backend proxy (avoids CORS issues)
 */
export async function getImageAsBase64(key: string): Promise<string> {
  try {
    const response = await fetch(`${S3_BACKEND_URL}/image-base64`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        bucket: AWS_BUCKET_NAME,
        key,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to get image as base64: ${response.statusText}`);
    }

    const data: { dataUrl: string } = await response.json();
    return data.dataUrl;
  } catch (error) {
    console.error(`Error getting image as base64 for ${key}:`, error);
    throw error;
  }
}
