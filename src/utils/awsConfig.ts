import { S3Client, HeadObjectCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// AWS Configuration
export const awsConfig = {
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
  region: process.env.AWS_REGION!,
  bucketName: process.env.AWS_BUCKET_NAME!,
};

// Create S3 client instance
export const s3Client = new S3Client({
  credentials: awsConfig.credentials,
  region: awsConfig.region,
});

// Helper function to get public URL for an object
export const getPublicUrl = (key: string): string => {
  return `https://${awsConfig.bucketName}.s3.${awsConfig.region}.amazonaws.com/${key}`;
};

// Helper function to generate a unique key for an image
export const generateImageKey = (filename: string): string => {
  const timestamp = new Date().getTime();
  const randomString = Math.random().toString(36).substring(7);
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `images/${timestamp}-${randomString}-${sanitizedFilename}`;
};

// Helper function to check if a key exists in the bucket
export const checkIfKeyExists = async (key: string): Promise<boolean> => {
  try {
    const command = new HeadObjectCommand({
      Bucket: awsConfig.bucketName,
      Key: key,
    });
    await s3Client.send(command);
    return true;
  } catch (error) {
    return false;
  }
};
