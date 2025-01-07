import React, { useState, useMemo } from 'react';
import { S3Item, ImageGalleryProps } from '../types';


const compareImageNames = (a: S3Item, b: S3Item): number => {
  const aNum = parseInt(a.name.match(/\d+/)?.[0] || '0');
  const bNum = parseInt(b.name.match(/\d+/)?.[0] || '0');
  return aNum - bNum;
};

const ImageGallery: React.FC<ImageGalleryProps> = ({ images }) => {
  const [selectedImage, setSelectedImage] = useState<S3Item | null>(null);
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());

  const sortedImages = useMemo(() => {
    if (!images?.length) return [];
    return images.sort((a, b) => compareImageNames(a, b));
  }, [images]);

  if (!images.length) {
    return null;
  }

  const handleClose = () => {
    setSelectedImage(null);
  };

  const handleImageLoad = (url: string) => {
    setLoadedImages(prev => {
      const newSet = new Set(prev);
      newSet.add(url);
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
        {sortedImages.map((image) => {
          const isLoaded = loadedImages.has(image.url);
          return (
            <div key={image.url} className="relative">
              <div 
                className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden"
              >
                <img
                  src={image.url}
                  alt={image.name}
                  className={`w-full h-full object-cover transition-all duration-300 ${
                    isLoaded ? 'opacity-100 cursor-pointer scale-100' : 'opacity-0 scale-95'
                  }`}
                  loading="lazy"
                  onLoad={() => handleImageLoad(image.url)}
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
              src={selectedImage.url}
              alt={selectedImage.name}
              className="max-w-full h-auto"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageGallery;