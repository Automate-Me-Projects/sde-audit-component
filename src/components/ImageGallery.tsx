import React, { useMemo, useState, useEffect } from 'react';
import { Image } from '../types';
import { compareImageNames } from '../utils';

interface ImageGalleryProps {
  images: Image[];
}

const ImageGallery: React.FC<ImageGalleryProps> = ({ images }) => {
  const [selectedImage, setSelectedImage] = useState<Image | null>(null);
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [errorImages, setErrorImages] = useState<Set<string>>(new Set());
  const [visibleImages, setVisibleImages] = useState<Image[]>([]);

  useEffect(() => {
    console.log('ImageGallery received images:', images);
  }, [images]);

  // Filter out images that failed to load
  useEffect(() => {
    const filtered = images.filter(img => !errorImages.has(img.id));
    setVisibleImages(filtered);
    console.log(`Showing ${filtered.length} images after filtering out errors`);
  }, [images, errorImages]);

  const sortedImages = useMemo(() => {
    console.log('Sorting images, count:', visibleImages.length);
    return [...visibleImages].sort((a, b) => compareImageNames(a.name || '', b.name || ''));
  }, [visibleImages]);

  const handleImageClick = (image: Image) => {
    console.log('Image clicked:', image);
    setSelectedImage(image);
  };

  const handleClose = () => {
    setSelectedImage(null);
  };

  const handleImageLoad = (imageId: string) => {
    console.log('Image loaded successfully:', imageId);
    setLoadedImages(prev => {
      const newSet = new Set(prev);
      newSet.add(imageId);
      return newSet;
    });
  };

  const handleImageError = (imageId: string) => {
    console.error('Error loading image:', imageId);
    setErrorImages(prev => {
      const newSet = new Set(prev);
      newSet.add(imageId);
      return newSet;
    });
  };

  return (
    <div className="w-full">
      <h2 className="text-[rgb(0,106,60)] text-xl font-medium mb-4">ANNEXES</h2>
      {sortedImages.length === 0 ? (
        <p className="text-gray-500 italic">Aucune image disponible</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {sortedImages.map((image) => {
            const isLoaded = loadedImages.has(image.id);

            return (
              <div key={image.id} className="relative">
                <h3 className="text-sm font-medium mb-2 text-gray-700">
                  {image.name || 'Sans nom'}
                </h3>
                <div className="relative">
                  {!isLoaded && (
                    <div className="absolute inset-0 bg-gray-100 animate-pulse rounded-lg" />
                  )}
                  <img
                    src={image.url}
                    alt={image.name || 'Image'}
                    className={`w-full h-auto rounded-lg shadow-md cursor-pointer transition-opacity duration-300 ${
                      isLoaded ? 'opacity-100' : 'opacity-0'
                    }`}
                    style={{ minHeight: '100px' }}
                    loading="lazy"
                    onLoad={() => handleImageLoad(image.id)}
                    onError={() => handleImageError(image.id)}
                    onClick={() => handleImageClick(image)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

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
              alt={selectedImage.name || 'Image'} 
              className="max-w-full h-auto"
              onError={() => handleImageError(selectedImage.id)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

ImageGallery.displayName = 'ImageGallery';

export default ImageGallery;
