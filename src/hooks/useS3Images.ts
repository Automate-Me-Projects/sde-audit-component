import { useState, useEffect } from 'react';
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
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());

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
        
        // Check which images actually exist
        const checkImageExists = async (image: Image): Promise<boolean> => {
          return new Promise((resolve) => {
            const img = new Image();
            let resolved = false;
            
            img.onload = () => {
              if (!resolved) {
                resolved = true;
                setLoadedImages(prev => new Set([...prev, image.id]));
                resolve(true);
              }
            };
            
            img.onerror = () => {
              if (!resolved) {
                resolved = true;
                resolve(false);
              }
            };
            
            // Set timeout to handle cases where the image takes too long to load
            setTimeout(() => {
              if (!resolved) {
                resolved = true;
                resolve(false);
              }
            }, 5000); // 5 second timeout
            
            img.src = image.url;
          });
        };

        // Process images sequentially by number to avoid race conditions
        const existingImages: Image[] = [];
        
        for (let i = 1; i <= 30; i++) {
          const imageNumber = i;
          let foundForNumber = false;
          
          // Try each format for this number
          for (const format of supportedFormats) {
            if (foundForNumber) break; // Skip remaining formats if we found one
            
            const imageName = `photo${imageNumber}.${format}`;
            const image = {
              id: `${auditId}_${imageName}`,
              key: `${auditId}_${imageName}`,
              name: imageName,
              url: `https://s3.${config.aws.region}.amazonaws.com/${config.aws.bucketName}/${auditId}_${imageName}`,
              auditId,
              createdAt: new Date().toISOString(),
            };
            
            const exists = await checkImageExists(image);
            if (exists) {
              existingImages.push(image);
              foundForNumber = true;
            }
          }
        }

        console.log(`Found ${existingImages.length} existing images`);
        setImages(existingImages);
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
