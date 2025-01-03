import { useState, useEffect } from 'react';
import { Image } from '../types';
import { config } from '../config';

// Helper function to get MIME type from file extension
const getMimeType = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'png':
      return 'image/png';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'gif':
      return 'image/gif';
    case 'webp':
      return 'image/webp';
    default:
      return 'application/octet-stream';
  }
};

export const useS3Images = (auditId: string) => {
  const [images, setImages] = useState<Image[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchImages = async () => {
      if (!auditId) {
        console.log('No auditId provided, skipping fetch');
        setImages([]);
        setLoading(false);
        return;
      }

      try {
        console.log('Fetching images for audit ID:', auditId);
        
        // Define supported formats
        const supportedFormats = ['png', 'jpg', 'jpeg', 'webp'];
        
        // Create image objects for all possible images (1-30) in all supported formats
        const imageObjects = Array.from({ length: 30 }, (_, i) => {
          const imageNumber = i + 1;
          return supportedFormats.map(format => {
            const imageName = `photo${imageNumber}.${format}`;
            const url = `https://s3.${config.aws.region}.amazonaws.com/${config.aws.bucketName}/${auditId}_${imageName}`;
            
            return {
              id: `${auditId}_${imageName}`,
              key: `${auditId}_${imageName}`,
              name: imageName,
              url,
              auditId,
              createdAt: new Date().toISOString(),
            };
          });
        }).flat(); // Flatten the array of arrays

        console.log(`Created ${imageObjects.length} image objects across ${supportedFormats.length} formats`);
        setImages(imageObjects);
        setLoading(false);
      } catch (err) {
        console.error('Error in fetchImages:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch images');
        setLoading(false);
      }
    };

    fetchImages();
  }, [auditId]);

  return { images, loading, error };
};
