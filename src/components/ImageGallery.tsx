import React, { useState, useMemo } from 'react';
import { S3ListResponse, S3Object } from '../types';
import { config } from '../config';

interface ImageGalleryProps {
  s3Response: S3ListResponse;
}

const getImageUrl = (key: string): string => {
  return `${config.aws.s3Url}/${key}`;
};

const getImageName = (key: string): string => {
  return key.split('_').pop() || key;
};

const compareImageNames = (a: string, b: string): number => {
  const aNum = parseInt(a.match(/\d+/)?.[0] || '0');
  const bNum = parseInt(b.match(/\d+/)?.[0] || '0');
  return aNum - bNum;
};

const ImageGallery: React.FC<ImageGalleryProps> = ({ s3Response }) => {
  const [selectedImage, setSelectedImage] = useState<S3Object | null>(null);
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());

  const images = useMemo(() => {
    if (!s3Response?.Contents?.length) return [];
    return s3Response.Contents
      .map(obj => ({
        url: getImageUrl(obj.Key),
        name: getImageName(obj.Key),
        key: obj.Key
      }))
      .sort((a, b) => compareImageNames(a.name, b.name));
  }, [s3Response]);

  if (!images.length) {
    return null;
  }

  const handleImageClick = (image: S3Object) => {
    setSelectedImage(image);
  };

  const handleClose = () => {
    setSelectedImage(null);
  };

  const handleImageLoad = (key: string) => {
    setLoadedImages(prev => {
      const newSet = new Set(prev);
      newSet.add(key);
      return newSet;
    });
  };

  return (
    <div className="w-full">
      <h2 className="text-[rgb(0,106,60)] text-xl font-medium mb-4">ANNEXES</h2>
      <div 
        className="grid gap-4"
        style={{ 
          gridTemplateColumns: 'repeat(6, minmax(0, 1fr))',
          gridAutoRows: '1fr'
        }}
      >
        {images.map((image) => {
          const isLoaded = loadedImages.has(image.key);
          return (
            <div key={image.key} className="relative">
              <div 
                className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden"
              >
                <img
                  src={image.url}
                  alt="Chargement..."
                  className={`w-full h-full object-cover transition-all duration-300 ${
                    isLoaded ? 'opacity-100 cursor-pointer scale-100' : 'opacity-0 scale-95'
                  }`}
                  loading="lazy"
                  onLoad={() => handleImageLoad(image.key)}
                  onClick={() => isLoaded && handleImageClick({ Key: image.key } as S3Object)}
                />
                {!isLoaded && (
                  <div className="absolute inset-0 animate-pulse" />
                )}
                {isLoaded && (
                  <div className="absolute top-0 left-0 right-0 bg-black bg-opacity-50 p-2">
                    <h3 className="text-sm font-medium text-white truncate">
                      {image.name}
                    </h3>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="relative bg-white p-4 rounded-lg max-w-4xl max-h-[90vh] overflow-auto">
            <button 
              className="absolute top-2 right-2 text-2xl text-gray-600 hover:text-gray-800"
              onClick={handleClose}
            >
              &times;
            </button>
            <img 
              src={getImageUrl(selectedImage.Key)} 
              alt={getImageName(selectedImage.Key)} 
              className="max-w-full h-auto"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageGallery;
