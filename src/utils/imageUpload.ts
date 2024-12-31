import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Image } from '../types';

const s3Client = new S3Client({
  region: process.env.VITE_AWS_REGION || 'eu-west-3',
  credentials: {
    accessKeyId: process.env.VITE_AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.VITE_AWS_SECRET_ACCESS_KEY || ''
  }
});

const BUCKET_NAME = process.env.VITE_S3_BUCKET_NAME || 'sde-audit-images-bucket';

export const generateImageKey = (buildingId: string, auditId: string, originalName: string): string => {
  const timestamp = new Date().getTime();
  const sanitizedName = originalName.replace(/[^a-zA-Z0-9.]/g, '_').toLowerCase();
  return `${buildingId}/${auditId}/${timestamp}_${sanitizedName}`;
};

export const uploadImage = async (
  file: File,
  buildingId: string,
  auditId: string
): Promise<Image> => {
  try {
    const imageKey = generateImageKey(buildingId, auditId, file.name);
    
    const uploadParams = {
      Bucket: BUCKET_NAME,
      Key: imageKey,
      Body: file,
      ContentType: file.type,
      ACL: 'public-read'
    };

    await s3Client.send(new PutObjectCommand(uploadParams));

    const imageUrl = `https://${BUCKET_NAME}.s3.${process.env.VITE_AWS_REGION}.amazonaws.com/${imageKey}`;

    const image: Image = {
      id: imageKey,
      name: file.name,
      url: imageUrl,
      isPublic: true,
      type: file.type,
      folderName: `${buildingId}/${auditId}`,
      auditId,
      buildingId,
      originalName: file.name,
      sizeBytes: file.size,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return image;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
};

export const deleteImage = async (image: Image): Promise<void> => {
  try {
    const deleteParams = {
      Bucket: BUCKET_NAME,
      Key: image.id // Using the image.id which contains the full path
    };

    await s3Client.send(new DeleteObjectCommand(deleteParams));
  } catch (error) {
    console.error('Error deleting image:', error);
    throw error;
  }
};
