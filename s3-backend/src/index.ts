import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import {
  S3Client,
  GetObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// ============ CONFIGURATION ============

const PORT = process.env.PORT || 3001;
const AWS_REGION = process.env.AWS_REGION || 'eu-west-3';
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:3000',
  'http://localhost:5173',
];
const PRESIGNED_URL_EXPIRATION = 3600; // 1 hour

// Validate required environment variables
if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
  console.error('Missing required AWS credentials in environment variables');
  process.exit(1);
}

// ============ AWS S3 CLIENT ============

const s3Client = new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
  },
});

// ============ EXPRESS APP ============

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.) in development
      if (!origin && process.env.NODE_ENV !== 'production') {
        return callback(null, true);
      }
      if (!origin || ALLOWED_ORIGINS.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Limit each IP to 500 requests per windowMs
  message: { error: 'Too many requests, please try again later.' },
});
app.use(limiter);

// Parse JSON bodies
app.use(express.json());

// ============ ROUTES ============

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Get presigned URL for a single object
app.post('/api/s3/presigned', async (req, res) => {
  try {
    const { bucket, key } = req.body;

    if (!bucket || !key) {
      return res.status(400).json({ error: 'Missing required parameters: bucket, key' });
    }

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const url = await getSignedUrl(s3Client, command, {
      expiresIn: PRESIGNED_URL_EXPIRATION,
    });

    res.json({
      url,
      expiresAt: Date.now() + PRESIGNED_URL_EXPIRATION * 1000,
    });
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    res.status(500).json({ error: 'Failed to generate presigned URL' });
  }
});

// List objects in a bucket with optional prefix
app.post('/api/s3/list', async (req, res) => {
  try {
    const { bucket, prefix, maxKeys = 1000 } = req.body;

    if (!bucket) {
      return res.status(400).json({ error: 'Missing required parameter: bucket' });
    }

    const command = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix || '',
      MaxKeys: Math.min(maxKeys, 1000),
    });

    const response = await s3Client.send(command);

    const items = (response.Contents || []).map((item) => ({
      key: item.Key,
      lastModified: item.LastModified?.toISOString(),
      size: item.Size,
    }));

    res.json({
      items,
      truncated: response.IsTruncated || false,
      nextContinuationToken: response.NextContinuationToken,
    });
  } catch (error) {
    console.error('Error listing S3 objects:', error);
    res.status(500).json({ error: 'Failed to list S3 objects' });
  }
});

// Batch presigned URLs (for efficiency)
app.post('/api/s3/presigned-batch', async (req, res) => {
  try {
    const { bucket, keys } = req.body;

    if (!bucket || !Array.isArray(keys) || keys.length === 0) {
      return res.status(400).json({ error: 'Missing required parameters: bucket, keys (array)' });
    }

    // Limit batch size to prevent abuse
    if (keys.length > 50) {
      return res.status(400).json({ error: 'Maximum 50 keys per batch request' });
    }

    const results = await Promise.all(
      keys.map(async (key: string) => {
        try {
          const command = new GetObjectCommand({
            Bucket: bucket,
            Key: key,
          });
          const url = await getSignedUrl(s3Client, command, {
            expiresIn: PRESIGNED_URL_EXPIRATION,
          });
          return { key, url, success: true };
        } catch (error) {
          return { key, url: null, success: false, error: 'Failed to generate URL' };
        }
      })
    );

    res.json({
      results,
      expiresAt: Date.now() + PRESIGNED_URL_EXPIRATION * 1000,
    });
  } catch (error) {
    console.error('Error generating batch presigned URLs:', error);
    res.status(500).json({ error: 'Failed to generate presigned URLs' });
  }
});

// Get image as base64 (proxy to avoid CORS issues)
app.post('/api/s3/image-base64', async (req, res) => {
  try {
    const { bucket, key } = req.body;

    if (!bucket || !key) {
      return res.status(400).json({ error: 'Missing required parameters: bucket, key' });
    }

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const response = await s3Client.send(command);

    if (!response.Body) {
      return res.status(404).json({ error: 'Image not found' });
    }

    // Convert stream to buffer
    const chunks: Uint8Array[] = [];
    for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    // Determine content type
    const contentType = response.ContentType || 'image/jpeg';

    // Convert to base64
    const base64 = buffer.toString('base64');
    const dataUrl = `data:${contentType};base64,${base64}`;

    res.json({ dataUrl });
  } catch (error) {
    console.error('Error fetching image as base64:', error);
    res.status(500).json({ error: 'Failed to fetch image' });
  }
});

// ============ ERROR HANDLING ============

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ============ START SERVER ============

app.listen(PORT, () => {
  console.log(`S3 Backend running on port ${PORT}`);
  console.log(`Allowed origins: ${ALLOWED_ORIGINS.join(', ')}`);
});
